const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createHash, createHmac } = require('node:crypto');
const { createOrderService } = require('../services/orderService');

const { MemoryDb } = require('./helpers/memoryDb');

const KEY_SECRET = 'rzp_test_secret_key';
const RAZORPAY_ORDER = 'order_TEST123';
const RAZORPAY_PAYMENT = 'pay_TEST456';

const user = { uid: 'buyer', email: 'buyer@example.test', role: 'customer' };
const admin = { uid: 'staff', role: 'admin' };
const shippingAddress = { fullName: 'Test Buyer', line1: '12 Test Road', line2: '', city: 'Mumbai', state: 'Maharashtra', zip: '400001', country: 'India', phone: '9876543210' };
const items = [{ productId: 'dress', quantity: 1, size: 'M', color: 'Orange' }];

// Stands in for the gateway so tests never make network calls.
function fakeRazorpay(overrides = {}) {
  const state = { orders: [], refunds: [], created: 0, payments: { [RAZORPAY_PAYMENT]: { id: RAZORPAY_PAYMENT, order_id: RAZORPAY_ORDER, status: 'captured', amount: 20795 } } };
  return {
    state,
    isConfigured: () => true,
    keyId: () => 'rzp_test_key',
    createOrder: async ({ amount, receipt }) => { state.created += 1; state.orders.push({ amount, receipt }); return { id: RAZORPAY_ORDER }; },
    refundPayment: async ({ paymentId, amount }) => { state.refunds.push({ paymentId, amount }); return { id: `rfnd_${state.refunds.length}` }; },
    // The webhook path confirms the payment against Razorpay before trusting it.
    fetchPayment: async paymentId => (state.payments[paymentId] || null),
    toPaise: rupees => Math.round(Number(rupees) * 100),
    toRupees: paise => Math.round(Number(paise)) / 100,
    verifyPaymentSignature: ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return false;
      const expected = createHmac('sha256', KEY_SECRET).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
      return expected === razorpaySignature;
    },
    ...overrides,
  };
}

const sign = (orderId, paymentId) => createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

beforeEach(() => { process.env.RAZORPAY_KEY_ID = 'rzp_test_key'; process.env.RAZORPAY_KEY_SECRET = KEY_SECRET; });

function setup(stock = 5, razorpay = fakeRazorpay()) {
  const db = new MemoryDb();
  db.data.set('products/dress', { name: 'Dress', price: 199.95, compareAtPrice: 999, stock, sizes: ['M'], colors: ['Orange'] });
  // Load the actual coupon validator against the same isolated database.
  const configPath = require.resolve('../config/firebaseAdmin');
  const couponPath = require.resolve('../controllers/couponsController');
  require.cache[configPath] = { id: configPath, filename: configPath, loaded: true, exports: { db, admin: {} } };
  delete require.cache[couponPath];
  const { validateCouponForOrder } = require(couponPath);
  const service = createOrderService({ db, validateCouponForOrder, razorpay });
  const payload = async (extra = {}) => ({ items, shippingAddress, paymentMethod: 'razorpay', requestId: 'request_1234567890', quoteId: (await service.quote({ items, couponCode: extra.couponCode }, user)).quoteId, ...extra });
  return { db, service, payload, razorpay };
}

// Places an order and settles it, mirroring the real checkout sequence.
// Accepts either the payload builder or an already-resolved body.
async function paidOrder(service, payload, extra) {
  const order = await service.create(await (typeof payload === 'function' ? payload(extra) : payload), user);
  await service.markPaid(order.id, { razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: sign(RAZORPAY_ORDER, RAZORPAY_PAYMENT) }, user);
  return order;
}

test('server uses sale price, fixed shipping and authenticated identity despite tampered fields', async () => {
  const { db, service, payload } = setup();
  const body = await payload({ total: 0, discount: 100000, shipping: -500, paymentStatus: 'paid', status: 'delivered', customerEmail: 'fake@example.test', currency: 'USD' });
  body.items = [{ ...items[0], price: 0, unitPrice: 0, lineTotal: -999 }];
  const order = (await service.create(body, user)).data();
  assert.equal(order.total, 207.95);
  assert.equal(order.items[0].unitPrice, 199.95);
  assert.equal(order.currency, 'INR');
  assert.equal(order.customerEmail, user.email);
  assert.equal(order.status, 'pending');
  assert.equal(order.paymentStatus, 'pending');
  assert.equal(order.paymentMethod, 'razorpay');
  assert.equal(db.data.get('products/dress').stock, 4);
});

test('invalid quantities, options, missing stock and bad addresses fail without writes', async () => {
  const { db, service, payload } = setup();
  const body = await payload();
  for (const quantity of [0, -1, 1.5, NaN, Infinity, '2', 100, null]) await assert.rejects(service.create({ ...body, items: [{ ...items[0], quantity }] }, user), { status: 400 });
  for (const variant of [{ size: '' }, { size: 'XL' }, { color: 'Blue' }]) await assert.rejects(service.create({ ...body, items: [{ ...items[0], ...variant }] }, user), { status: 409 });
  for (const patch of [{ zip: '000000' }, { phone: '123' }, { country: 'USA' }, { fullName: '' }]) await assert.rejects(service.create({ ...body, shippingAddress: { ...shippingAddress, ...patch } }, user), { status: 400 });
  // Only the two supported methods are accepted, and they are matched exactly.
  for (const method of ['card', 'COD', 'cash', 'COD ', 'netbanking', undefined, null]) await assert.rejects(service.create({ ...body, paymentMethod: method }, user), { status: 400 });
  db.data.get('products/dress').stock = undefined;
  await assert.rejects(service.create(body, user), { status: 409 });
  assert.equal([...db.data.keys()].filter(k => k.startsWith('orders/')).length, 0);
});

test('duplicate product lines cannot bypass aggregate stock checks', async () => {
  const { service } = setup(1);
  await assert.rejects(service.quote({ items: [items[0], items[0]] }, user), { status: 409 });
});

test('simultaneous checkout retries return one order and reserve once, even at zero remaining stock', async () => {
  const { db, service, payload } = setup(1);
  const body = await payload();
  const results = await Promise.all([service.create(body, user), service.create(body, user)]);
  assert.equal(results[0].id, results[1].id);
  assert.equal(db.data.get('products/dress').stock, 0);
  assert.equal((await service.recover(body.requestId, user)).id, results[0].id);
  assert.equal(await service.recover(body.requestId, { ...user, uid: 'other' }), null);
  await assert.rejects(service.create({ ...body, shippingAddress: { ...shippingAddress, line1: '99 Another Road' } }, user), { status: 409 });
});

test('competing buyers cannot oversell the last unit', async () => {
  const { db, service, payload } = setup(1);
  const body = await payload();
  const results = await Promise.allSettled([service.create(body, user), service.create(body, { ...user, uid: 'other' })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
  assert.equal(db.data.get('products/dress').stock, 0);
});

test('price changes require a refreshed quote and never partially reserve inventory', async () => {
  const { db, service, payload } = setup();
  const body = await payload();
  db.data.get('products/dress').price = 250;
  await assert.rejects(service.create(body, user), { status: 409 });
  assert.equal(db.data.get('products/dress').stock, 5);
  body.quoteId = (await service.quote({ items }, user)).quoteId;
  assert.equal((await service.create(body, user)).data().total, 258);
});

test('actual coupon validation enforces expiry, usage and per-user limits in the order transaction', async () => {
  const { db, service, payload } = setup();
  db.data.set('coupons/promo', { code: 'SAVE10', active: true, scope: 'storewide', discountType: 'percentage', discountValue: 10, minimumOrderValue: 100, perUserLimit: 1, usageLimit: 2, usedCount: 0, expiresAt: new Date(Date.now() + 86400000) });
  const body = await payload({ couponCode: 'SAVE10' });
  const order = (await service.create(body, user)).data();
  assert.equal(order.discount, 20);
  assert.equal(order.total, 187.95);
  await service.create(body, user);
  assert.equal(db.data.get('coupons/promo').usedCount, 1);
  await assert.rejects(service.quote({ items, couponCode: 'SAVE10' }, user), /per-user limit/);
  db.data.get('coupons/promo').expiresAt = new Date(0);
  await assert.rejects(service.quote({ items, couponCode: 'SAVE10' }, admin), /expired/);
  db.data.get('coupons/promo').expiresAt = new Date(Date.now() + 86400000);
  db.data.get('coupons/promo').usedCount = 2;
  await assert.rejects(service.quote({ items, couponCode: 'SAVE10' }, admin), /usage limit/);
});

test('customer cancellation is owner-only, atomic, restores stock once and refunds the payment', async () => {
  const { db, service, payload, razorpay } = setup();
  const order = await paidOrder(service, payload);
  await assert.rejects(service.update(order.id, {}, { ...user, uid: 'other' }, true), { status: 403 });
  await assert.rejects(service.update(order.id, { status: 'processing' }, user), { status: 403 });
  await service.update(order.id, { status: 'processing' }, admin);
  await Promise.all([service.update(order.id, {}, user, true), service.update(order.id, {}, user, true)]);
  const cancelled = (await order.ref.get()).data();
  assert.equal(db.data.get('products/dress').stock, 5);
  assert.equal(cancelled.paymentStatus, 'refunded');
  assert.equal(cancelled.inventoryReserved, false);
  assert.equal(cancelled.razorpayRefundId, 'rfnd_1');
  assert.equal(razorpay.state.refunds.length, 1, 'a retry must not refund twice');
  assert.equal(razorpay.state.refunds[0].amount, 207.95);
  await assert.rejects(service.update(order.id, { status: 'processing' }, admin), { status: 409 });
});

test('delivery requires payment and ordered transitions; final states cannot reopen', async () => {
  const { db, service, payload } = setup();
  const unpaid = await service.create(await payload(), user);
  // An unpaid order must not advance through the fulfilment flow.
  await assert.rejects(service.update(unpaid.id, { status: 'processing' }, admin), { status: 409 });
  // Release it so this test asserts on a single order's stock.
  await service.releaseUnpaid(unpaid.id, user);
  const order = await paidOrder(service, payload, { requestId: 'request_0987654321' });
  await assert.rejects(service.update(order.id, { status: 'delivered' }, admin), { status: 409 });
  await assert.rejects(service.update(order.id, { status: 'typo' }, admin), { status: 400 });
  await service.update(order.id, { status: 'processing' }, admin);
  await service.update(order.id, { status: 'shipped' }, admin);
  await assert.rejects(service.update(order.id, {}, user, true), { status: 409 });
  // No cash confirmation is required for a prepaid order.
  const delivered = (await service.update(order.id, { status: 'delivered' }, admin)).data();
  assert.equal(delivered.status, 'delivered');
  assert.equal(delivered.paymentStatus, 'paid');
  await service.update(order.id, { status: 'delivered' }, admin);
  // pending, paid, processing, shipped, delivered. A repeat is a no-op.
  assert.equal((await order.ref.get()).data().statusHistory.length, 5);
  await assert.rejects(service.update(order.id, { status: 'cancelled' }, admin), { status: 409 });
  // The abandoned order was released, so only the delivered order holds stock.
  assert.equal(db.data.get('products/dress').stock, 4);
});

test('competing cancellation and shipment have only one winner', async () => {
  const { db, service, payload } = setup();
  const order = await paidOrder(service, payload);
  await service.update(order.id, { status: 'processing' }, admin);
  const outcomes = await Promise.allSettled([service.update(order.id, {}, user, true), service.update(order.id, { status: 'shipped' }, admin)]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
  const state = (await order.ref.get()).data().status;
  assert.equal(db.data.get('products/dress').stock, state === 'cancelled' ? 5 : 4);
});

test('razorpay order is created once per order and amounts are sent in paise', async () => {
  const { service, payload, razorpay } = setup();
  const body = await payload();
  const [first, second] = await Promise.all([service.create(body, user), service.create(body, user)]);
  assert.equal(first.id, second.id);
  assert.equal(razorpay.state.created, 1, 'retries must reuse the same gateway order');
  assert.deepEqual(razorpay.state.orders[0], { amount: 207.95, receipt: first.id });
  assert.equal(first.data().razorpayOrderId, RAZORPAY_ORDER);
  // 207.95 rupees must reach Razorpay as 20795 paise.
  const { toPaise, toRupees } = require('../lib/razorpay');
  assert.equal(toPaise(207.95), 20795);
  assert.equal(toPaise(0.1 + 0.2), 30);
  assert.equal(toRupees(20795), 207.95);
});

test('a failed signature or foreign order id never marks an order paid', async () => {
  const { db, service, payload } = setup();
  const order = await service.create(await payload(), user);
  // Browser callback: an attacker cannot forge an HMAC without the key secret.
  for (const body of [
    { razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: 'not-a-signature' },
    { razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: '' },
    { razorpayPaymentId: '', razorpaySignature: '' },
    // Truncated or wrong-length signatures must not throw, just fail.
    { razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: 'abc' },
  ]) await assert.rejects(service.markPaid(order.id, { ...body, source: 'checkout' }, user), { status: 400 });
  // Another user cannot confirm this order's payment.
  await assert.rejects(service.markPaid(order.id, { razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: sign(RAZORPAY_ORDER, RAZORPAY_PAYMENT), source: 'checkout' }, { ...user, uid: 'other' }), { status: 403 });
  // Webhook path: authenticated by its own HMAC, so it confirms against Razorpay.
  await assert.rejects(service.markPaid(order.id, { razorpayOrderId: 'order_OTHER', razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: null, source: 'webhook' }), { status: 400 });
  await assert.rejects(service.markPaid(order.id, { razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: 'pay_UNKNOWN', razorpaySignature: null, source: 'webhook' }), { status: 400 });
  assert.equal((await order.ref.get()).data().paymentStatus, 'pending');
  assert.equal(db.data.get('products/dress').stock, 4);
});

test('a webhook for a short or mismatched capture is refused', async () => {
  const { service, payload, razorpay } = setup();
  const order = await service.create(await payload(), user);
  const withPayments = (payments) => {
    razorpay.state.payments = payments;
  };
  const key = (extra) => ({ ...extra, id: RAZORPAY_PAYMENT, order_id: RAZORPAY_ORDER });

  // Partial capture: order total is 207.95 rupees = 20795 paise.
  withPayments({ [RAZORPAY_PAYMENT]: key({ status: 'captured', amount: 5000 }) });
  await assert.rejects(service.markPaid(order.id, { razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, source: 'webhook' }), { status: 409 });

  // Not yet captured.
  withPayments({ [RAZORPAY_PAYMENT]: key({ status: 'created', amount: 20795 }) });
  await assert.rejects(service.markPaid(order.id, { razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, source: 'webhook' }), { status: 400 });

  // Payment belongs to a different Razorpay order.
  withPayments({ [RAZORPAY_PAYMENT]: { id: RAZORPAY_PAYMENT, order_id: 'order_OTHER', status: 'captured', amount: 20795 } });
  await assert.rejects(service.markPaid(order.id, { razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, source: 'webhook' }), { status: 400 });

  // The full amount settles it.
  withPayments({ [RAZORPAY_PAYMENT]: key({ status: 'captured', amount: 20795 }) });
  assert.equal((await service.markPaid(order.id, { razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, source: 'webhook' })).data().paymentStatus, 'paid');
});

test('markPaid is idempotent across a browser callback and a webhook race', async () => {
  const { service, payload } = setup();
  const order = await service.create(await payload(), user);
  const result = { razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: sign(RAZORPAY_ORDER, RAZORPAY_PAYMENT) };
  await service.markPaid(order.id, { ...result, source: 'webhook' });
  await service.markPaid(order.id, { ...result, source: 'webhook' });
  await service.markPaid(order.id, { ...result, source: 'checkout' }, user);
  const order0 = (await order.ref.get()).data();
  assert.equal(order0.paymentStatus, 'paid');
  assert.equal(order0.amountCollected, 207.95);
  assert.equal(order0.statusHistory.filter(entry => entry.status === 'paid').length, 1);
});

test('releasing an unpaid order restores stock and coupon usage exactly once', async () => {
  const { db, service, payload } = setup();
  db.data.set('coupons/promo', { code: 'SAVE10', active: true, scope: 'storewide', discountType: 'percentage', discountValue: 10, minimumOrderValue: 100, usageLimit: 5, usedCount: 0, expiresAt: new Date(Date.now() + 86400000) });
  const order = await service.create(await payload({ couponCode: 'SAVE10' }), user);
  assert.equal(db.data.get('coupons/promo').usedCount, 1);
  assert.equal(db.data.get('products/dress').stock, 4);
  await assert.rejects(service.releaseUnpaid(order.id, { ...user, uid: 'other' }), { status: 403 });
  await Promise.all([service.releaseUnpaid(order.id, user), service.releaseUnpaid(order.id, user)]);
  const released = (await order.ref.get()).data();
  assert.equal(released.paymentStatus, 'failed');
  assert.equal(released.status, 'cancelled');
  assert.equal(released.inventoryReserved, false);
  assert.equal(db.data.get('products/dress').stock, 5, 'stock must be returned, not doubled');
  assert.equal(db.data.get('coupons/promo').usedCount, 0, 'coupon usage must be returned');
});

test('a paid order cannot be released and a released order cannot be paid later', async () => {
  const { db, service, payload } = setup();
  const order = await paidOrder(service, payload);
  await assert.rejects(service.releaseUnpaid(order.id, user), { status: 409 });
  assert.equal(db.data.get('products/dress').stock, 4);

  const abandoned = await service.create(await payload({ requestId: 'request_abcdef123456' }), user);
  await service.releaseUnpaid(abandoned.id, user);
  await assert.rejects(service.markPaid(abandoned.id, { razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: sign(RAZORPAY_ORDER, RAZORPAY_PAYMENT), source: 'webhook' }), { status: 409 });
});

test('a gateway failure while creating the payment order releases reserved stock', async () => {
  const { db, service, payload } = setup(5, fakeRazorpay({ createOrder: async () => { throw new Error('gateway down'); } }));
  await assert.rejects(service.create(await payload(), user), { status: 502 });
  assert.equal(db.data.get('products/dress').stock, 5, 'stock must not be stranded');
  assert.equal([...db.data.keys()].filter(key => key.startsWith('orders/')).length, 1);
  assert.equal(db.data.get([...db.data.keys()].find(key => key.startsWith('orders/'))).paymentStatus, 'failed');
});

test('checkout is refused when razorpay keys are missing', async () => {
  const db = new MemoryDb();
  db.data.set('products/dress', { name: 'Dress', price: 199.95, stock: 5, sizes: ['M'], colors: ['Orange'] });
  const service = createOrderService({ db, validateCouponForOrder: async () => ({ code: '', discountAmount: 0 }), razorpay: { isConfigured: () => false } });
  const body = { items, shippingAddress, paymentMethod: 'razorpay', requestId: 'request_1234567890', quoteId: (await service.quote({ items }, user)).quoteId };
  await assert.rejects(service.create(body, user), { status: 503 });
  assert.equal(db.data.get('products/dress').stock, 5);
});

test('cash on delivery reserves stock without touching the gateway', async () => {
  const { db, service, payload, razorpay } = setup();
  const body = await payload({ paymentMethod: 'cod', requestId: 'request_cod_1234567' });
  const order = await service.create(body, user);
  assert.equal(razorpay.state.created, 0, 'a cash order must not open a gateway order');
  assert.equal(order.data().razorpayOrderId, null);
  assert.equal(order.data().paymentProvider, 'cash_on_delivery');
  assert.equal(order.data().paymentStatus, 'pending');
  assert.equal(order.data().status, 'pending');
  assert.equal(order.data().total, 207.95, 'the same quote total applies to both methods');
  assert.equal(db.data.get('products/dress').stock, 4);
  // A retry reuses the same order and never reserves stock twice.
  assert.equal((await service.create(body, user)).id, order.id);
  assert.equal(db.data.get('products/dress').stock, 4);
  assert.equal(razorpay.state.created, 0);
});

test('cash on delivery still works when razorpay keys are missing', async () => {
  const db = new MemoryDb();
  db.data.set('products/dress', { name: 'Dress', price: 199.95, stock: 5, sizes: ['M'], colors: ['Orange'] });
  const service = createOrderService({ db, validateCouponForOrder: async () => ({ code: '', discountAmount: 0 }), razorpay: { isConfigured: () => false } });
  const body = { items, shippingAddress, paymentMethod: 'cod', requestId: 'request_cod_1234567', quoteId: (await service.quote({ items }, user)).quoteId };
  assert.equal((await service.create(body, user)).data().paymentMethod, 'cod');
  assert.equal(db.data.get('products/dress').stock, 4);
});

test('a cash order can never be settled by a payment callback or webhook', async () => {
  const { db, service, payload } = setup();
  const order = await service.create(await payload({ paymentMethod: 'cod', requestId: 'request_cod_1234567' }), user);
  await assert.rejects(service.markPaid(order.id, { razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: sign(RAZORPAY_ORDER, RAZORPAY_PAYMENT), source: 'checkout' }, user), { status: 409 });
  await assert.rejects(service.markPaid(order.id, { razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, source: 'webhook' }), { status: 409 });
  const state = (await order.ref.get()).data();
  assert.equal(state.paymentStatus, 'pending');
  assert.equal(state.amountCollected, 0);
  assert.equal(db.data.get('products/dress').stock, 4);
});

test('a cash order is fulfilled on its normal timeline and collects cash on delivery', async () => {
  const { db, service, payload, razorpay } = setup();
  const order = await service.create(await payload({ paymentMethod: 'cod', requestId: 'request_cod_1234567' }), user);
  // Unlike a prepaid order it may advance before any money changes hands.
  await service.update(order.id, { status: 'processing' }, admin);
  await service.update(order.id, { status: 'shipped' }, admin);
  const delivered = (await service.update(order.id, { status: 'delivered' }, admin)).data();
  assert.equal(delivered.status, 'delivered');
  assert.equal(delivered.paymentStatus, 'paid');
  assert.equal(delivered.amountCollected, 207.95);
  assert.equal(delivered.paymentConfirmedBy, 'cash_on_delivery');
  assert.ok(delivered.deliveredAt, 'delivery must be stamped for the return window');
  assert.equal(razorpay.state.refunds.length, 0);
  // A repeat transition must not collect the cash twice.
  await service.update(order.id, { status: 'delivered' }, admin);
  assert.equal((await order.ref.get()).data().statusHistory.filter(entry => entry.status === 'paid' || entry.status === 'delivered').length, 1);
  assert.equal(db.data.get('products/dress').stock, 4);
});

test('cancelling a cash order restores stock without a gateway refund', async () => {
  const { db, service, payload, razorpay } = setup();
  db.data.set('coupons/promo', { code: 'SAVE10', active: true, scope: 'storewide', discountType: 'percentage', discountValue: 10, minimumOrderValue: 100, usageLimit: 5, usedCount: 0, expiresAt: new Date(Date.now() + 86400000) });
  const order = await service.create(await payload({ paymentMethod: 'cod', couponCode: 'SAVE10', requestId: 'request_cod_1234567' }), user);
  assert.equal(db.data.get('coupons/promo').usedCount, 1);
  await assert.rejects(service.update(order.id, {}, { ...user, uid: 'other' }, true), { status: 403 });
  await Promise.all([service.update(order.id, {}, user, true), service.update(order.id, {}, user, true)]);
  const cancelled = (await order.ref.get()).data();
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.paymentStatus, 'cancelled', 'nothing was collected, so nothing is refunded');
  assert.equal(cancelled.inventoryReserved, false);
  assert.equal(razorpay.state.refunds.length, 0);
  assert.equal(db.data.get('products/dress').stock, 5, 'stock must be returned, not doubled');
  assert.equal(db.data.get('coupons/promo').usedCount, 0, 'coupon usage must be returned');
});

test('switching payment method cannot reuse an existing checkout request', async () => {
  const { service, payload } = setup();
  const body = await payload({ paymentMethod: 'razorpay', requestId: 'request_cod_1234567' });
  await service.create(body, user);
  await assert.rejects(service.create({ ...body, paymentMethod: 'cod' }, user), { status: 409 });
});

test('a delivered cash order is eligible for a return and refunds manually', async () => {
  const { service, payload } = setup();
  const order = await service.create(await payload({ paymentMethod: 'cod', requestId: 'request_cod_1234567' }), user);
  await service.update(order.id, { status: 'processing' }, admin);
  await service.update(order.id, { status: 'shipped' }, admin);
  await service.update(order.id, { status: 'delivered' }, admin);
  const { eligibility } = require('../services/returnService');
  assert.equal(eligibility((await order.ref.get()).data()).eligible, true);
});

test('razorpay signature helpers reject tampering and use constant-time comparison', async () => {
  const { verifyPaymentSignature, verifyWebhookSignature, safeEqual } = require('../lib/razorpay');
  assert.equal(verifyPaymentSignature({ razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: sign(RAZORPAY_ORDER, RAZORPAY_PAYMENT) }), true);
  assert.equal(verifyPaymentSignature({ razorpayOrderId: RAZORPAY_ORDER, razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: sign(RAZORPAY_ORDER, 'pay_OTHER') }), false);
  assert.equal(verifyPaymentSignature({}), false);
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'x', razorpayPaymentId: 'y', razorpaySignature: 'short' }), false);

  process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
  const raw = Buffer.from('{"event":"payment.captured"}');
  const good = createHmac('sha256', 'whsec_test').update(raw).digest('hex');
  assert.equal(verifyWebhookSignature(raw, good), true);
  // A re-serialized body must not validate against a signature of the raw bytes.
  assert.equal(verifyWebhookSignature(Buffer.from(JSON.stringify({ event: 'payment.captured' }, null, 2)), good), false);
  assert.equal(verifyWebhookSignature(raw, 'bad'), false);
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  assert.equal(verifyWebhookSignature(raw, good), false);

  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), false);
  assert.equal(createHash('sha256').update('x').digest('hex').length, 64);
});

test('the webhook route verifies signatures and reconciles a captured payment', async () => {
  const { db, service, payload } = setup();
  const order = await service.create(await payload(), user);
  const config = require.cache[require.resolve('../config/firebaseAdmin')].exports;
  for (const module of ['../routes/webhooks', '../controllers/couponsController', '../services/orderService', '../services/returnService', '../controllers/returnsController']) delete require.cache[require.resolve(module)];
  // The webhook router builds its own service; reuse the same memory database.
  require.cache[require.resolve('../services/orderService')] = { id: require.resolve('../services/orderService'), filename: require.resolve('../services/orderService'), loaded: true, exports: { createOrderService: () => service } };
  // The router must verify the real HMAC, so extend the fake with the real
  // webhook check rather than stubbing it out.
  const realRazorpay = require('../lib/razorpay');
  const fake = fakeRazorpay();
  require.cache[require.resolve('../lib/razorpay')] = { id: require.resolve('../lib/razorpay'), filename: require.resolve('../lib/razorpay'), loaded: true, exports: { ...fake, verifyWebhookSignature: realRazorpay.verifyWebhookSignature } };
  process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
  const express = require('express');
  const app = express();
  app.use('/api/webhooks', express.raw({ type: 'application/json' }), require('../routes/webhooks'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  // The event travels in a header and the signature covers the exact raw bytes.
  const post = (event, rawBody, signature) => fetch(`http://127.0.0.1:${server.address().port}/api/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-event': event, ...(signature ? { 'x-razorpay-signature': signature } : {}) },
    body: rawBody,
  });
  const captured = { event: 'payment.captured', payload: { payment: { entity: { id: RAZORPAY_PAYMENT, order_id: RAZORPAY_ORDER } } } };
  try {
    const body = JSON.stringify(captured);
    assert.equal((await post(captured.event, body, 'forged')).status, 400);
    assert.equal((await order.ref.get()).data().paymentStatus, 'pending');
    const signature = createHmac('sha256', 'whsec_test').update(body).digest('hex');
    // A valid signature over different bytes must still be rejected.
    assert.equal((await post(captured.event, JSON.stringify({ ...captured, extra: 1 }), signature)).status, 400);
    assert.equal((await post(captured.event, body, signature)).status, 200);
    const settled = (await order.ref.get()).data();
    assert.equal(settled.paymentStatus, 'paid');
    assert.equal(settled.paymentConfirmedBy, 'webhook');
    // Replayed webhooks must be a no-op.
    assert.equal((await post(captured.event, body, signature)).status, 200);
    assert.equal((await order.ref.get()).data().statusHistory.filter(entry => entry.status === 'paid').length, 1);
    // An unhandled event is acknowledged but changes nothing.
    assert.equal((await post('subscription.charged', body, createHmac('sha256', 'whsec_test').update(body).digest('hex'))).status, 200);
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('a payment.failed webhook releases stock for the matching order', async () => {
  const { db, service, payload } = setup();
  const order = await service.create(await payload(), user);
  for (const module of ['../routes/webhooks', '../controllers/couponsController', '../services/orderService', '../services/returnService', '../controllers/returnsController']) delete require.cache[require.resolve(module)];
  require.cache[require.resolve('../services/orderService')] = { id: require.resolve('../services/orderService'), filename: require.resolve('../services/orderService'), loaded: true, exports: { createOrderService: () => service } };
  const realRazorpay = require('../lib/razorpay');
  const fake = fakeRazorpay();
  require.cache[require.resolve('../lib/razorpay')] = { id: require.resolve('../lib/razorpay'), filename: require.resolve('../lib/razorpay'), loaded: true, exports: { ...fake, verifyWebhookSignature: realRazorpay.verifyWebhookSignature } };
  process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
  const express = require('express');
  const app = express();
  app.use('/api/webhooks', express.raw({ type: 'application/json' }), require('../routes/webhooks'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const body = JSON.stringify({ event: 'payment.failed', payload: { payment: { entity: { id: RAZORPAY_PAYMENT, order_id: RAZORPAY_ORDER, code: 'BAD_CARD' } } } });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-event': 'payment.failed', 'x-razorpay-signature': createHmac('sha256', 'whsec_test').update(body).digest('hex') },
      body,
    });
    assert.equal(response.status, 200);
    const released = (await order.ref.get()).data();
    assert.equal(released.paymentStatus, 'failed');
    assert.equal(released.inventoryReserved, false);
    assert.equal(db.data.get('products/dress').stock, 5);
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('HTTP order routes enforce authentication, roles, ownership and prohibit deletion', async () => {
  const { db } = setup();
  db.data.set('users/buyer', { role: 'customer' });
  db.data.set('users/staff', { role: 'admin' });
  const config = require.cache[require.resolve('../config/firebaseAdmin')].exports;
  config.auth = { verifyIdToken: async token => { if (!['buyer', 'staff', 'other'].includes(token)) throw Error('Invalid token'); return { uid: token, email: `${token}@example.test` }; } };
  for (const module of ['../controllers/ordersController', '../middleware/auth', '../routes/orders', '../services/orderService']) delete require.cache[require.resolve(module)];
  const express = require('express');
  const app = express(); app.use(express.json()); app.use('/api/orders', require('../routes/orders'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  async function call(path, method, token, body) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/orders${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  }
  try {
    assert.equal((await call('/quote', 'POST', null, { items })).status, 401);
    const quote = await call('/quote', 'POST', 'buyer', { items });
    assert.equal(quote.status, 200);
    const created = await call('', 'POST', 'buyer', { items, shippingAddress, requestId: 'http_request_123456789', quoteId: quote.body.quoteId, paymentMethod: 'razorpay' });
    assert.equal(created.status, 201);
    const id = created.body.id;
    assert.equal(created.body.razorpayOrderId, RAZORPAY_ORDER);
    assert.equal((await call(`/${id}`, 'GET', 'other')).status, 403);
    assert.equal((await call(`/${id}/status`, 'PUT', 'buyer', { status: 'delivered' })).status, 403);
    assert.equal((await call(`/${id}/cancel`, 'PUT', 'other', {})).status, 403);
    assert.equal((await call(`/${id}`, 'DELETE', 'staff')).status, 405);
    // A forged signature must never mark the order paid.
    assert.equal((await call(`/${id}/verify-payment`, 'POST', 'buyer', { razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: 'deadbeef' })).status, 400);
    assert.equal((await call(`/${id}/verify-payment`, 'POST', 'other', { razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: sign(RAZORPAY_ORDER, RAZORPAY_PAYMENT) })).status, 403);
    const paid = await call(`/${id}/verify-payment`, 'POST', 'buyer', { razorpayPaymentId: RAZORPAY_PAYMENT, razorpaySignature: sign(RAZORPAY_ORDER, RAZORPAY_PAYMENT) });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.paymentStatus, 'paid');
    assert.equal((await call(`/${id}/verify-payment`, 'POST', null, {})).status, 401);
    assert.equal((await call(`/${id}/cancel`, 'PUT', 'buyer', {})).status, 200);
    assert.equal((await call(`/${id}/status`, 'PUT', 'staff', { status: 'processing' })).status, 409);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
