const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createOrderService } = require('../services/orderService');

const { MemoryDb } = require('./helpers/memoryDb');

const user = { uid: 'buyer', email: 'buyer@example.test', role: 'customer' };
const admin = { uid: 'staff', role: 'admin' };
const shippingAddress = { fullName: 'Test Buyer', line1: '12 Test Road', line2: '', city: 'Mumbai', state: 'Maharashtra', zip: '400001', country: 'India', phone: '9876543210' };
const items = [{ productId: 'dress', quantity: 1, size: 'M', color: 'Orange' }];

function setup(stock = 5) {
  const db = new MemoryDb();
  db.data.set('products/dress', { name: 'Dress', price: 199.95, compareAtPrice: 999, stock, sizes: ['M'], colors: ['Orange'] });
  // Load the actual coupon validator against the same isolated database.
  const configPath = require.resolve('../config/firebaseAdmin');
  const couponPath = require.resolve('../controllers/couponsController');
  require.cache[configPath] = { id: configPath, filename: configPath, loaded: true, exports: { db, admin: {} } };
  delete require.cache[couponPath];
  const { validateCouponForOrder } = require(couponPath);
  const service = createOrderService({ db, validateCouponForOrder });
  const payload = async (extra = {}) => ({ items, shippingAddress, paymentMethod: 'cod', requestId: 'request_1234567890', quoteId: (await service.quote({ items, couponCode: extra.couponCode }, user)).quoteId, ...extra });
  return { db, service, payload };
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
  assert.equal(db.data.get('products/dress').stock, 4);
});

test('invalid quantities, options, missing stock and bad addresses fail without writes', async () => {
  const { db, service, payload } = setup();
  const body = await payload();
  for (const quantity of [0, -1, 1.5, NaN, Infinity, '2', 100, null]) await assert.rejects(service.create({ ...body, items: [{ ...items[0], quantity }] }, user), { status: 400 });
  for (const variant of [{ size: '' }, { size: 'XL' }, { color: 'Blue' }]) await assert.rejects(service.create({ ...body, items: [{ ...items[0], ...variant }] }, user), { status: 409 });
  for (const patch of [{ zip: '000000' }, { phone: '123' }, { country: 'USA' }, { fullName: '' }]) await assert.rejects(service.create({ ...body, shippingAddress: { ...shippingAddress, ...patch } }, user), { status: 400 });
  await assert.rejects(service.create({ ...body, paymentMethod: 'card' }, user), { status: 400 });
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

test('customer cancellation is owner-only, atomic and restores stock exactly once', async () => {
  const { db, service, payload } = setup();
  const order = await service.create(await payload(), user);
  await assert.rejects(service.update(order.id, {}, { ...user, uid: 'other' }, true), { status: 403 });
  await assert.rejects(service.update(order.id, { status: 'processing' }, user), { status: 403 });
  await service.update(order.id, { status: 'processing' }, admin);
  await Promise.all([service.update(order.id, {}, user, true), service.update(order.id, {}, user, true)]);
  const cancelled = (await order.ref.get()).data();
  assert.equal(db.data.get('products/dress').stock, 5);
  assert.equal(cancelled.paymentStatus, 'cancelled');
  assert.equal(cancelled.statusHistory.length, 3);
  await assert.rejects(service.update(order.id, { status: 'processing' }, admin), { status: 409 });
});

test('delivery requires ordered transitions and exact confirmed cash; final states cannot reopen', async () => {
  const { db, service, payload } = setup();
  const order = await service.create(await payload(), user);
  await assert.rejects(service.update(order.id, { status: 'delivered' }, admin), { status: 409 });
  await assert.rejects(service.update(order.id, { status: 'typo' }, admin), { status: 400 });
  await service.update(order.id, { status: 'processing' }, admin);
  await service.update(order.id, { status: 'shipped' }, admin);
  await assert.rejects(service.update(order.id, {}, user, true), { status: 409 });
  for (const patch of [{}, { cashCollected: true, amountCollected: 1 }, { cashCollected: false, amountCollected: 207.95 }]) await assert.rejects(service.update(order.id, { status: 'delivered', ...patch }, admin), { status: 400 });
  const delivered = (await service.update(order.id, { status: 'delivered', cashCollected: true, amountCollected: 207.95 }, admin)).data();
  assert.equal(delivered.paymentStatus, 'paid');
  assert.equal(delivered.cashCollectedBy, admin.uid);
  await service.update(order.id, { status: 'delivered', cashCollected: true, amountCollected: 207.95 }, admin);
  assert.equal((await order.ref.get()).data().statusHistory.length, 4);
  await assert.rejects(service.update(order.id, { status: 'cancelled' }, admin), { status: 409 });
  assert.equal(db.data.get('products/dress').stock, 4);
});

test('competing cancellation and shipment have only one winner', async () => {
  const { db, service, payload } = setup();
  const order = await service.create(await payload(), user);
  await service.update(order.id, { status: 'processing' }, admin);
  const outcomes = await Promise.allSettled([service.update(order.id, {}, user, true), service.update(order.id, { status: 'shipped' }, admin)]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1);
  const state = (await order.ref.get()).data().status;
  assert.equal(db.data.get('products/dress').stock, state === 'cancelled' ? 5 : 4);
});

test('HTTP order routes enforce authentication, roles, ownership and prohibit deletion', async () => {
  const { db } = setup();
  db.data.set('users/buyer', { role: 'customer' });
  db.data.set('users/staff', { role: 'admin' });
  const config = require.cache[require.resolve('../config/firebaseAdmin')].exports;
  config.auth = { verifyIdToken: async token => { if (!['buyer', 'staff', 'other'].includes(token)) throw Error('Invalid token'); return { uid: token, email: `${token}@example.test` }; } };
  for (const module of ['../controllers/ordersController', '../middleware/auth', '../routes/orders']) delete require.cache[require.resolve(module)];
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
    const created = await call('', 'POST', 'buyer', { items, shippingAddress, requestId: 'http_request_123456789', quoteId: quote.body.quoteId, paymentMethod: 'cod' });
    assert.equal(created.status, 201);
    const id = created.body.id;
    assert.equal((await call(`/${id}`, 'GET', 'other')).status, 403);
    assert.equal((await call(`/${id}/status`, 'PUT', 'buyer', { status: 'delivered' })).status, 403);
    assert.equal((await call(`/${id}/cancel`, 'PUT', 'other', {})).status, 403);
    assert.equal((await call(`/${id}`, 'DELETE', 'staff')).status, 405);
    assert.equal((await call(`/${id}/cancel`, 'PUT', 'buyer', {})).status, 200);
    assert.equal((await call(`/${id}/status`, 'PUT', 'staff', { status: 'processing' })).status, 409);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
