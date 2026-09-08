const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryDb } = require('./helpers/memoryDb');
const { createReturnService, refundForLine, eligibility } = require('../services/returnService');
const user = { uid: 'buyer', role: 'customer' };
const admin = { uid: 'staff', role: 'admin' };
const item = { productId: 'dress', productName: 'Dress', size: 'M', color: 'Orange', quantity: 2, lineTotal: 200, unitPrice: 100, returnEligible: true };
const request = { lineIndex: 0, type: 'return', reason: 'The fit is too small, tags are intact.' };
function setup() {
  const db = new MemoryDb();
  db.data.set('orders/order-1', { userId: user.uid, customerName: 'Buyer', status: 'delivered', paymentStatus: 'paid', deliveredAt: new Date(), total: 188, subtotal: 200, discount: 20, items: [structuredClone(item)] });
  db.data.set('products/dress', { name: 'Dress', stock: 3, price: 100, sizes: ['M', 'L'], colors: ['Orange', 'Blue'] });
  return { db, service: createReturnService({ db }) };
}

test('return requests are owner-only, delivered/paid, within the window and for purchased lines', async () => {
  const { db, service } = setup();
  await assert.rejects(service.create('order-1', request, { uid: 'other' }), { status: 403 });
  await assert.rejects(service.listForOrder('order-1', { uid: 'other' }), { status: 403 });
  await assert.rejects(service.create('order-1', { ...request, lineIndex: 2 }, user), { status: 409 });
  await assert.rejects(service.create('order-1', { ...request, reason: 'bad' }, user), { status: 400 });
  const order = db.data.get('orders/order-1');
  order.status = 'shipped';
  await assert.rejects(service.create('order-1', request, user), { status: 409 });
  order.status = 'delivered'; order.deliveredAt = new Date(Date.now() - 8 * 86400000);
  await assert.rejects(service.create('order-1', request, user), { status: 409 });
  order.deliveredAt = new Date(); order.items[0].returnEligible = false;
  await assert.rejects(service.create('order-1', request, user), { status: 409 });
  assert.equal((await db.collection('returnRequests').get()).docs.length, 0);
});

test('return expiry has an exact boundary and handles missing delivery timestamps', () => {
  const now = new Date('2026-09-08T12:00:00Z');
  const order = { status: 'delivered', paymentStatus: 'paid', deliveredAt: new Date(now - 7 * 86400000) };
  assert.equal(eligibility(order, now).eligible, true);
  assert.equal(eligibility(order, new Date(+now + 1)).eligible, false);
  assert.equal(eligibility({ ...order, deliveredAt: null }, now).eligible, false);
});

test('duplicate requests cannot claim a purchased line twice or tamper with refund amounts', async () => {
  const { db, service } = setup();
  const payload = { ...request, refundAmount: 99999, quantity: 100, status: 'completed' };
  const [a, b] = await Promise.all([service.create('order-1', payload, user), service.create('order-1', payload, user)]);
  assert.equal(a.id, b.id); assert.equal(a.refundAmount, 180); assert.equal(a.item.quantity, 2); assert.equal(a.status, 'requested');
  assert.equal(db.data.get('products/dress').stock, 3);
  await assert.rejects(service.create('order-1', { ...request, reason: 'A different request reason.' }, user), { status: 409 });
});

test('discount allocation preserves pennies across item refunds and excludes shipping', () => {
  const order = { items: [{ lineTotal: 0.01 }, { lineTotal: 0.01 }, { lineTotal: 0.01 }], discount: 0.01, total: 8.02 };
  assert.equal(order.items.reduce((sum, _, i) => sum + refundForLine(order, i), 0), 0.02);
});

test('return approval, inspection and refund completion are guarded and idempotent', async () => {
  const { db, service } = setup();
  const created = await service.create('order-1', request, user);
  await assert.rejects(service.update(created.id, { status: 'approved', note: 'Send it back.' }, user), { status: 403 });
  await assert.rejects(service.update(created.id, { status: 'completed' }, admin), { status: 409 });
  await assert.rejects(service.update(created.id, { status: 'approved' }, admin), { status: 400 });
  await service.update(created.id, { status: 'approved', note: 'Return unused items with the order ID.' }, admin);
  await assert.rejects(service.update(created.id, { status: 'received' }, admin), { status: 400 });
  await Promise.all([service.update(created.id, { status: 'received', inspected: true, restock: true }, admin), service.update(created.id, { status: 'received', inspected: true, restock: true }, admin)]);
  assert.equal(db.data.get('products/dress').stock, 5);
  await assert.rejects(service.update(created.id, { status: 'completed', refundConfirmed: true, refundAmount: 9999, refundReference: 'REF-1' }, admin), { status: 400 });
  const completion = { status: 'completed', refundConfirmed: true, refundAmount: 180, refundReference: 'REF-1' };
  await Promise.all([service.update(created.id, completion, admin), service.update(created.id, completion, admin)]);
  assert.equal(db.data.get('orders/order-1').refundedAmount, 180);
  assert.equal(db.data.get('orders/order-1').paymentStatus, 'partially_refunded');
  assert.equal((await service.listForOrder('order-1', user)).requests[0].history.length, 4);
  await assert.rejects(service.update(created.id, { status: 'approved', note: 'Reopen request.' }, admin), { status: 409 });
});

test('rejection needs a reason, leaves inventory untouched and is final', async () => {
  const { db, service } = setup();
  const created = await service.create('order-1', request, user);
  await service.update(created.id, { status: 'rejected', note: 'Items were altered and do not meet the policy.' }, admin);
  assert.equal(db.data.get('products/dress').stock, 3);
  await assert.rejects(service.update(created.id, { status: 'approved', note: 'Approved now.' }, admin), { status: 409 });
});

test('exchanges validate options, reserve replacement stock once, and track shipment and delivery', async () => {
  const { db, service } = setup();
  const payload = { ...request, type: 'exchange', size: 'L', color: 'Blue' };
  await assert.rejects(service.create('order-1', { ...payload, size: 'XL' }, user), { status: 400 });
  await assert.rejects(service.create('order-1', { ...payload, size: 'M', color: 'Orange' }, user), { status: 400 });
  const created = await service.create('order-1', payload, user);
  await service.update(created.id, { status: 'approved', note: 'Return your item for inspection.' }, admin);
  await service.update(created.id, { status: 'received', inspected: true, restock: false }, admin);
  assert.equal(db.data.get('products/dress').stock, 1);
  await service.update(created.id, { status: 'received', inspected: true, restock: false }, admin);
  assert.equal(db.data.get('products/dress').stock, 1);
  await assert.rejects(service.update(created.id, { status: 'completed', deliveryConfirmed: true }, admin), { status: 409 });
  await assert.rejects(service.update(created.id, { status: 'exchange_shipped' }, admin), { status: 400 });
  await service.update(created.id, { status: 'exchange_shipped', carrier: 'Test Courier', trackingNumber: 'TRACK-1' }, admin);
  await assert.rejects(service.update(created.id, { status: 'completed' }, admin), { status: 400 });
  const completed = await service.update(created.id, { status: 'completed', deliveryConfirmed: true }, admin);
  assert.equal(completed.trackingNumber, 'TRACK-1'); assert.equal(completed.status, 'completed');
  assert.equal(db.data.get('orders/order-1').refundedAmount, undefined);
});

test('out-of-stock exchange rolls back receipt and never restocks before replacement validation', async () => {
  const { db, service } = setup();
  const created = await service.create('order-1', { ...request, type: 'exchange', size: 'L', color: 'Blue' }, user);
  await service.update(created.id, { status: 'approved', note: 'Send items back for inspection.' }, admin);
  db.data.get('products/dress').stock = 0;
  await assert.rejects(service.update(created.id, { status: 'received', inspected: true, restock: true }, admin), { status: 409 });
  assert.equal(db.data.get('products/dress').stock, 0);
  assert.equal(db.data.get(`returnRequests/${created.id}`).status, 'approved');
});

test('HTTP return routes enforce customer ownership and admin approval permissions', async () => {
  const { db } = setup();
  db.data.set('users/buyer', { role: 'customer' }); db.data.set('users/staff', { role: 'admin' });
  const config = require.resolve('../config/firebaseAdmin');
  require.cache[config] = { id: config, filename: config, loaded: true, exports: { db, auth: { verifyIdToken: async token => { if (!['buyer', 'staff', 'other'].includes(token)) throw Error('Invalid'); return { uid: token }; } } } };
  const express = require('express'); const app = express(); app.use(express.json());
  const ctrl = require('../controllers/returnsController'); const { verifyToken } = require('../middleware/auth');
  app.post('/orders/:id/returns', verifyToken, ctrl.create); app.get('/orders/:id/returns', verifyToken, ctrl.listForOrder); app.use('/returns', require('../routes/returns'));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  async function call(path, method, token, body) { const r = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); return { status: r.status, data: await r.json() }; }
  try {
    assert.equal((await call('/orders/order-1/returns', 'POST', null, request)).status, 401);
    assert.equal((await call('/orders/order-1/returns', 'GET', 'other')).status, 403);
    const created = await call('/orders/order-1/returns', 'POST', 'buyer', request); assert.equal(created.status, 200);
    assert.equal((await call('/returns', 'GET', 'buyer')).status, 403);
    assert.equal((await call('/returns', 'GET', 'staff')).data.length, 1);
    assert.equal((await call(`/returns/${created.data.id}`, 'PUT', 'buyer', { status: 'approved', note: 'Approve this.' })).status, 403);
    assert.equal((await call(`/returns/${created.data.id}`, 'PUT', 'staff', { status: 'approved', note: 'Please send your item back.' })).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
