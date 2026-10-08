const { test } = require('node:test');
const assert = require('node:assert/strict');

const { MemoryDb } = require('./helpers/memoryDb');
const { createShipmentService } = require('../services/shipmentService');
const { createOrderService } = require('../services/orderService');

const user = { uid: 'buyer', email: 'buyer@example.test', role: 'customer' };
const shippingAddress = { fullName: 'Test Buyer', line1: '12 Test Road', line2: '', city: 'Mumbai', state: 'Maharashtra', zip: '400001', country: 'India', phone: '9876543210' };
const items = [{ productId: 'dress', quantity: 1, size: 'M', color: 'Orange' }];
const ORDER_A = 'TGNR-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1';
const ORDER_B = 'TGNR-BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB2';

function seedProducts(db) {
  db.data.set('products/dress', { name: 'Dress', price: 199.95, stock: 5, sizes: ['M'], colors: ['Orange'], weight: 0.3, length: 30, breadth: 20, height: 5 });
  db.data.set('products/shirt', { name: 'Shirt', price: 99, stock: 5, weight: 0.25, length: 30, breadth: 22, height: 4 });
  db.data.set('products/legacy', { name: 'Legacy', price: 49, stock: 5 });
}

function seedOrder(db, id = ORDER_A, overrides = {}) {
  db.data.set(`orders/${id}`, {
    orderId: id,
    userId: 'buyer',
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    status: 'processing',
    subtotal: 199.95,
    total: 207.95,
    customerEmail: 'buyer@example.test',
    items: [{ productId: 'dress', productName: 'Dress', quantity: 1, unitPrice: 199.95 }],
    shippingAddress,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return id;
}

// Stands in for lib/shiprocket.js so tests never touch the network.
function fakeShiprocket(overrides = {}) {
  const state = { createCalls: 0, cancelCalls: [], trackCalls: 0, tracked: [] };
  const fake = {
    state,
    isConfigured: () => true,
    packageDefaults: () => ({ weight: 0.5, length: 25, breadth: 20, height: 5 }),
    describeShiprocketError: err => String(err?.message || 'error'),
    createAdhocOrder: async () => {
      state.createCalls += 1;
      return { duplicate: false, srOrderId: 1000 + state.createCalls, shipmentId: 500 + state.createCalls, raw: {} };
    },
    trackByOrderId: async () => {
      state.trackCalls += 1;
      return state.tracked.shift() || null;
    },
    trackAwb: async () => null,
    cancelAdhocOrders: async args => {
      state.cancelCalls.push(args);
      return {};
    },
    normalizeTrackPayload: payload => ({
      awb: String(payload.awb_code || ''),
      courierName: String(payload.courier_company || payload.courier_name || ''),
      status: String(payload.current_status || payload.status || ''),
      currentStatus: String(payload.current_status || ''),
      edd: '',
      trackUrl: '',
      activities: [],
    }),
    ...overrides,
  };
  return fake;
}

function normalized(overrides = {}) {
  return { awb: '', courierName: '', status: '', currentStatus: '', edd: '', trackUrl: '', activities: [], ...overrides };
}

function shipmentFor(db, fake, retryDelays = [0, 0]) {
  return createShipmentService({ db, shiprocket: fake, retryDelays });
}

test('a paid order is handed to Shiprocket once, with ids and package recorded', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const id = seedOrder(db);
  const fake = fakeShiprocket();
  const shipment = shipmentFor(db, fake);

  const snap = await shipment.onOrderReady(id);
  assert.ok(snap?.exists);
  const data = snap.data();
  assert.equal(data.shiprocket.status, 'created');
  assert.equal(data.shiprocket.duplicate, false);
  assert.equal(data.shiprocket.orderId, 1001);
  assert.equal(data.shiprocket.shipmentId, 501);
  assert.equal(data.shiprocket.attempts, 1);
  assert.equal(data.shiprocket.lastError, null);
  assert.equal(data.shipmentRetryNeeded, false);
  assert.equal(data.shiprocketSrOrderId, '1001');
  assert.deepEqual(data.shiprocket.package, { weight: 0.3, length: 30, breadth: 20, height: 5 });
  assert.equal(fake.state.createCalls, 1);

  // A second trigger (browser callback racing the webhook) must be a no-op.
  await shipment.onOrderReady(id);
  assert.equal(fake.state.createCalls, 1);
});

test('unpaid, cancelled, unconfigured, in-flight and finished orders are never handed over', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const fake = fakeShiprocket();

  const off = shipmentFor(db, fakeShiprocket({ isConfigured: () => false }));
  const unpaid = seedOrder(db, 'TGNR-UNPAID00000000000000000000001', { paymentStatus: 'pending' });
  assert.equal(await off.onOrderReady(unpaid), null);
  assert.equal(await off.onOrderReady(seedOrder(db, 'TGNR-OFFCONFIG00000000000000000001')), null);
  assert.equal(db.data.get(`orders/${unpaid}`).shiprocket, undefined);

  const shipment = shipmentFor(db, fake);
  const cancelled = seedOrder(db, 'TGNR-CANCELLED0000000000000000001', { status: 'cancelled' });
  const inFlight = seedOrder(db, 'TGNR-INFLIGHT00000000000000000001', {
    shiprocket: { status: 'creating', updatedAt: new Date().toISOString() },
    shipmentRetryNeeded: true,
  });
  const finished = seedOrder(db, 'TGNR-FINISHED00000000000000000001', {
    shiprocket: { status: 'created', orderId: 77 },
  });
  const codUnpaid = seedOrder(db, 'TGNR-CODUNPAID0000000000000000001', { paymentMethod: 'cod', paymentStatus: 'pending', status: 'pending' });

  await shipment.onOrderReady(cancelled);
  assert.equal(db.data.get(`orders/${cancelled}`).shiprocket, undefined);
  await shipment.onOrderReady(finished);
  assert.equal(db.data.get(`orders/${finished}`).shipmentRetryNeeded, undefined);
  // The in-flight claim keeps its flag so the sweep retries after the guard
  // window, but a parallel trigger must not start a second creation.
  await shipment.onOrderReady(inFlight);
  assert.equal(db.data.get(`orders/${inFlight}`).shipmentRetryNeeded, true);
  assert.equal(fake.state.createCalls, 0);
  // COD needs no payment confirmation: a pending cash order ships immediately.
  await shipment.onOrderReady(codUnpaid);
  assert.equal(db.data.get(`orders/${codUnpaid}`).shiprocket.status, 'created');
  assert.equal(fake.state.createCalls, 1);
});

test('a failed creation records the error, retries in the background, and self-heals', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const id = seedOrder(db);
  let down = true;
  const fake = fakeShiprocket({
    createAdhocOrder: async () => {
      fake.state.createCalls += 1;
      if (down) throw new Error('Shiprocket is down');
      return { duplicate: false, srOrderId: 909, shipmentId: 303, raw: {} };
    },
  });
  const shipment = shipmentFor(db, fake, [0, 0]);

  assert.equal(await shipment.onOrderReady(id), null);
  let data = db.data.get(`orders/${id}`);
  assert.equal(data.shiprocket.status, 'error');
  assert.equal(data.shiprocket.attempts, 3);
  assert.equal(data.shipmentRetryNeeded, true);
  assert.match(data.shiprocket.lastError, /down/);
  assert.equal(fake.state.createCalls, 3);

  // The sweep is the recovery path: no panel visit, no manual retry.
  down = false;
  const sweep = await shipment.sweepOnce();
  assert.deepEqual(sweep, { checked: 1, created: 1 });
  data = db.data.get(`orders/${id}`);
  assert.equal(data.shiprocket.status, 'created');
  assert.equal(data.shiprocket.orderId, 909);
  assert.equal(data.shipmentRetryNeeded, false);
  assert.equal(data.shiprocket.lastError, null);

  // Nothing is left to do on the next pass.
  assert.deepEqual(await shipment.sweepOnce(), { checked: 0, created: 0 });
});

test('orders out of attempts or eligibility stop filling the sweep window', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const fake = fakeShiprocket();
  const shipment = shipmentFor(db, fake);

  const spent = seedOrder(db, 'TGNR-SPENT0000000000000000000000001', {
    shiprocket: { status: 'error', attempts: 20, lastError: 'exhausted' },
    shipmentRetryNeeded: true,
  });
  const cancelled = seedOrder(db, 'TGNR-SWEEPCANCEL00000000000000001', { status: 'cancelled', shipmentRetryNeeded: true });
  const shipped = seedOrder(db, 'TGNR-SWEEPSHIPPED00000000000000001', { status: 'shipped', shipmentRetryNeeded: true });

  const sweep = await shipment.sweepOnce();
  assert.deepEqual(sweep, { checked: 3, created: 0 });
  assert.equal(fake.state.createCalls, 0);
  assert.equal(db.data.get(`orders/${spent}`).shipmentRetryNeeded, false);
  assert.equal(db.data.get(`orders/${cancelled}`).shipmentRetryNeeded, false);
  assert.equal(db.data.get(`orders/${shipped}`).shipmentRetryNeeded, false);
});

test('a duplicate order id is adopted instead of failing forever', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const id = seedOrder(db);
  const fake = fakeShiprocket({
    createAdhocOrder: async () => {
      fake.state.createCalls += 1;
      return { duplicate: true, srOrderId: null, shipmentId: null, raw: null };
    },
  });
  const shipment = shipmentFor(db, fake);

  const snap = await shipment.onOrderReady(id);
  const data = snap.data();
  assert.equal(data.shiprocket.status, 'created');
  assert.equal(data.shiprocket.duplicate, true);
  assert.equal(data.shiprocket.orderId, null);
  assert.equal(data.shipmentRetryNeeded, false);
  assert.equal(data.shiprocketSrOrderId, null);
});

test('tracking is pulled, merged, throttled and mapped onto order status', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const id = seedOrder(db, ORDER_A, {
    shiprocket: { status: 'created', orderId: 1001, tracking: null },
  });
  const fake = fakeShiprocket();
  fake.state.tracked.push(normalized({
    awb: 'AWB123',
    courierName: 'Delhivery',
    status: 'Out for delivery',
    currentStatus: 'Out for delivery',
    edd: '2026-10-10',
    trackUrl: 'https://tracking.example/AWB123',
    activities: [{ date: '10-10-2026 10:00', activity: 'Picked up', location: 'Mumbai', status: '' }],
  }));
  const shipment = shipmentFor(db, fake);

  const first = await shipment.refreshTracking(id);
  assert.equal(first.throttled, false);
  // "Out for delivery" must never be read as delivered.
  assert.equal(first.suggestedStatus, 'shipped');
  const data = db.data.get(`orders/${id}`);
  assert.equal(data.shiprocket.awb, 'AWB123');
  assert.equal(data.shiprocket.courierName, 'Delhivery');
  assert.equal(data.shiprocket.etd, '2026-10-10');
  assert.equal(data.shiprocketAwb, 'AWB123');
  assert.equal(data.shiprocket.tracking.activities.length, 1);

  // Within the throttle window the cache is served and Shiprocket is not paid
  // a second visit.
  const second = await shipment.refreshTracking(id);
  assert.equal(second.throttled, true);
  assert.equal(second.suggestedStatus, null);
  assert.equal(fake.state.trackCalls, 1);
});

test('tracking refresh maps delivered, refused and return labels correctly', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const shipment = shipmentFor(db, fakeShiprocket());

  assert.equal(shipment.suggestStatus('shipped', normalized({ status: 'Delivered', currentStatus: 'Delivered' })), 'delivered');
  assert.equal(shipment.suggestStatus('processing', normalized({ status: 'In Transit', currentStatus: 'In Transit' })), 'shipped');
  assert.equal(shipment.suggestStatus('processing', normalized({ status: 'Picked up', currentStatus: 'Picked up' })), 'shipped');
  assert.equal(shipment.suggestStatus('processing', normalized({ status: 'RTO - returning to origin' })), null);
  assert.equal(shipment.suggestStatus('processing', normalized({ status: 'Undelivered - customer refused' })), null);
  assert.equal(shipment.suggestStatus('processing', normalized({ status: '' })), null);
  assert.equal(shipment.suggestStatus('shipped', null), null);

  // Panel-created order: no local shipment record, so refresh adopts it.
  const id = seedOrder(db, ORDER_A);
  const fake = fakeShiprocket();
  fake.state.tracked.push(normalized({ awb: 'AWB77', courierName: 'BlueDart', status: 'In Transit', currentStatus: 'In Transit' }));
  const adopter = shipmentFor(db, fake);
  const result = await adopter.refreshTracking(id);
  const data = db.data.get(`orders/${id}`);
  assert.equal(data.shiprocket.status, 'created');
  assert.equal(data.shiprocket.duplicate, true);
  assert.equal(data.shiprocket.awb, 'AWB77');
  assert.equal(data.shiprocketAwb, 'AWB77');
  assert.equal(result.suggestedStatus, 'shipped');
});

test('tracking refresh fails closed when unconfigured, unknown, or invalid', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const id = seedOrder(db);
  const configured = shipmentFor(db, fakeShiprocket());
  await assert.rejects(configured.refreshTracking('missing/id'), { status: 400 });
  await assert.rejects(configured.refreshTracking('TGNR-DOESNOTEXIST0000000000000001'), { status: 404 });

  const off = shipmentFor(db, fakeShiprocket({ isConfigured: () => false }));
  await assert.rejects(off.refreshTracking(id), { status: 503 });
});

test('a Shiprocket webhook updates tracking, matches every id shape, and suggests a status', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const shipment = shipmentFor(db, fakeShiprocket());

  const byOurs = seedOrder(db, ORDER_A, { shiprocket: { status: 'created', orderId: 1001 } });
  const first = await shipment.applyTrackingPayload({ order_id: byOurs, awb_code: 'AWB9', courier_company: 'BlueDart', current_status: 'In Transit' });
  assert.equal(first.matched, true);
  assert.equal(first.suggestedStatus, 'shipped');
  let data = db.data.get(`orders/${byOurs}`);
  assert.equal(data.shiprocket.awb, 'AWB9');
  assert.equal(data.shiprocketAwb, 'AWB9');

  // Shiprocket may echo its own numeric id instead of ours.
  const bySr = seedOrder(db, ORDER_B, {
    shiprocket: { status: 'created', orderId: 4242 },
    shiprocketSrOrderId: '4242',
  });
  const second = await shipment.applyTrackingPayload({ order_id: 4242, awb_code: 'AWB10', current_status: 'Delivered' });
  assert.equal(second.matched, true);
  assert.equal(second.suggestedStatus, 'delivered');
  data = db.data.get(`orders/${bySr}`);
  assert.equal(data.shiprocket.awb, 'AWB10');

  // Or matched purely by AWB once the courier is assigned.
  const byAwb = seedOrder(db, 'TGNR-BYAWB0000000000000000000000001', {
    shiprocket: { status: 'created', orderId: 555 },
    shiprocketAwb: 'AWB555',
  });
  const third = await shipment.applyTrackingPayload({ awb_code: 'AWB555', current_status: 'Out for delivery' });
  assert.equal(third.matched, true);
  assert.equal(third.suggestedStatus, 'shipped');

  assert.equal((await shipment.applyTrackingPayload({ order_id: 'TGNR-UNKNOWN00000000000000000001', awb_code: 'NOPE' })).matched, false);
  assert.equal((await shipment.applyTrackingPayload(null)).matched, false);
});

test('cancelling the website order cancels it in Shiprocket, and remote failures never throw', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const fake = fakeShiprocket();
  const id = seedOrder(db, ORDER_A, { shiprocket: { status: 'created', orderId: 1001 }, shipmentRetryNeeded: false });
  const shipment = shipmentFor(db, fake);

  const snap = await shipment.onOrderCancelled(id, 'Customer changed their mind');
  assert.equal(snap.data().shiprocket.status, 'cancelled');
  assert.equal(snap.data().shipmentRetryNeeded, false);
  assert.deepEqual(fake.state.cancelCalls[0], { srOrderIds: [1001], reason: 'Customer changed their mind' });

  // Already-cancelled, pre-creation and unconfigured orders are no-ops.
  assert.equal(await shipment.onOrderCancelled(id), null);
  const notCreated = seedOrder(db, ORDER_B, { status: 'cancelled' });
  assert.equal(await shipment.onOrderCancelled(notCreated), null);

  // An order already handed to the courier: the failure is logged, the local
  // status keeps whatever the website decided, and no error escapes.
  const failing = fakeShiprocket({ cancelAdhocOrders: async () => { throw new Error('Order already shipped'); } });
  const remoteFail = seedOrder(db, 'TGNR-REMOTFAIL00000000000000000001', { shiprocket: { status: 'created', orderId: 1002 } });
  const strict = shipmentFor(db, failing);
  assert.equal(await strict.onOrderCancelled(remoteFail), null);
  assert.equal(db.data.get(`orders/${remoteFail}`).shiprocket.status, 'created');
});

test('package dimensions sum across lines and fall back to defaults for legacy products', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const shipment = shipmentFor(db, fakeShiprocket());

  const parcel = await shipment.computePackage({
    items: [
      { productId: 'shirt', quantity: 2 },
      { productId: 'legacy', quantity: 1 },
    ],
  });
  // 0.25 kg x2 plus the 0.5 kg default; widest footprint; stacked heights.
  assert.deepEqual(parcel, { weight: 1, length: 30, breadth: 22, height: 13 });

  const empty = await shipment.computePackage({ items: [] });
  assert.deepEqual(empty, { weight: 0, length: 0, breadth: 0, height: 5 });
});

test('checkout and payment flows trigger Shiprocket; cancellation mirrors remotely', async () => {
  const db = new MemoryDb();
  seedProducts(db);
  const calls = { ready: [], cancelled: [] };
  const shipment = {
    onOrderReady: async id => { calls.ready.push(id); return null; },
    onOrderCancelled: async (id, reason) => { calls.cancelled.push({ id, reason }); return null; },
  };
  const razorpay = {
    isConfigured: () => true,
    createOrder: async () => ({ id: 'order_GATEWAY1' }),
    verifyPaymentSignature: () => true,
    refundPayment: async () => ({ id: 'rfnd_1' }),
    describeGatewayError: err => String(err?.message || 'error'),
    fetchPayment: async () => null,
  };
  const service = createOrderService({ db, validateCouponForOrder: async () => null, razorpay, shipment });

  // Cash on delivery ships the moment the order is placed.
  const codQuote = await service.quote({ items }, user);
  const codOrder = await service.create({
    items, shippingAddress, paymentMethod: 'cod',
    requestId: 'request_cod_0000001', quoteId: codQuote.quoteId,
  }, user);
  assert.deepEqual(calls.ready, [codOrder.id]);

  // Online payments wait for settlement, then trigger exactly once per settle.
  const rzpQuote = await service.quote({ items }, user);
  const rzpOrder = await service.create({
    items, shippingAddress, paymentMethod: 'razorpay',
    requestId: 'request_rzp_0000001', quoteId: rzpQuote.quoteId,
  }, user);
  assert.equal(calls.ready.length, 1);
  await service.markPaid(rzpOrder.id, {
    razorpayOrderId: 'order_GATEWAY1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig', source: 'checkout',
  }, user);
  assert.equal(calls.ready.length, 2);
  assert.equal(calls.ready[1], rzpOrder.id);
  // A replayed confirmation re-runs the ensure step; the transactional claim
  // inside onOrderReady makes that safe (a second call never creates twice).
  await service.markPaid(rzpOrder.id, {
    razorpayOrderId: 'order_GATEWAY1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig', source: 'checkout',
  }, user);
  assert.equal(calls.ready.length, 3);

  await service.update(rzpOrder.id, {}, user, true);
  assert.equal(calls.cancelled.length, 1);
  assert.equal(calls.cancelled[0].id, rzpOrder.id);
  assert.ok(calls.cancelled[0].reason.length > 0);
});
