const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryDb } = require('./helpers/memoryDb');
const { createOrderService } = require('../services/orderService');
function setup() {
  const db = new MemoryDb();
  const config = require.resolve('../config/firebaseAdmin');
  const path = require.resolve('../controllers/couponsController');
  require.cache[config] = { id: config, filename: config, loaded: true, exports: { db, admin: { firestore: { Timestamp: { now: () => new Date() } } } } };
  delete require.cache[path];
  const ctrl = require(path);
  const call = async (handler, body = {}, params = {}, query = {}) => {
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(data) { this.body = data; return this; } };
    await ctrl[handler]({ body, params, query, user: { uid: 'buyer' } }, res);
    return res;
  };
  const coupon = { code: 'SAVE10', discountType: 'percentage', discountValue: 10, expiresAt: new Date(Date.now() + 86400000).toISOString(), active: true, scope: 'storewide', usageLimit: 1, perUserLimit: 1 };
  return { db, ctrl, call, coupon, service: createOrderService({ db, validateCouponForOrder: ctrl.validateCouponForOrder }) };
}
test('concurrent coupon creation reserves a unique code; deleted codes cannot reset history', async () => {
  const { call, coupon } = setup();
  const results = await Promise.all([call('createCoupon', coupon), call('createCoupon', coupon)]);
  assert.deepEqual(results.map(r => r.statusCode).sort(), [201, 409]);
  const created = results.find(r => r.statusCode === 201).body;
  assert.equal((await call('deleteCoupon', {}, { id: created.id })).statusCode, 200);
  assert.equal((await call('createCoupon', coupon)).statusCode, 409);
});
test('editing can clear limits, preserves usage, and rejects malformed configuration', async () => {
  const { call, coupon, db } = setup();
  const created = (await call('createCoupon', coupon)).body;
  db.data.get(`coupons/${created.id}`).usedCount = 1;
  const updated = await call('updateCoupon', { usageLimit: null, perUserLimit: null, usedCount: 0 }, { id: created.id });
  assert.equal(updated.body.usageLimit, null);
  assert.equal(updated.body.perUserLimit, null);
  assert.equal(updated.body.usedCount, 1);
  for (const patch of [{ usageLimit: -1 }, { perUserLimit: 1.5 }, { minimumOrderValue: 'bad' }, { active: 'false' }, { discountValue: 101 }]) assert.equal((await call('updateCoupon', patch, { id: created.id })).statusCode, 400);
});
test('product offers use catalog category and omit expired, exhausted and unrelated coupons', async () => {
  const { call, coupon, db } = setup();
  db.data.set('products/dress', { categorySlug: 'dresses' });
  for (const [id, patch] of Object.entries({ valid: {}, expired: { expiresAt: new Date(0) }, exhausted: { usedCount: 1 }, unrelated: { scope: 'categories', categorySlugs: ['shoes'] } })) db.data.set(`coupons/${id}`, { ...coupon, ...patch });
  const res = await call('getPublicCoupons', {}, {}, { productId: 'dress', categorySlug: 'shoes' });
  assert.deepEqual(res.body.map(c => c.id), ['valid']);
});
test('scoped discounts, immutable snapshots and competing redemptions are transaction-safe', async () => {
  const { db, coupon, service } = setup();
  db.data.set('products/dress', { price: 100, stock: 10, categorySlug: 'dresses' });
  db.data.set('products/shoe', { price: 200, stock: 10, categorySlug: 'shoes' });
  db.data.set('coupons/promo', { ...coupon, scope: 'categories', categorySlugs: ['dresses'], discountType: 'fixed', discountValue: 150 });
  const items = [{ productId: 'dress', quantity: 1 }, { productId: 'shoe', quantity: 1 }];
  const user = { uid: 'buyer' };
  const quote = await service.quote({ items, couponCode: 'SAVE10' }, user);
  assert.equal(quote.discount, 100);
  assert.equal(quote.total, 208);
  const body = { items, couponCode: 'SAVE10', quoteId: quote.quoteId, requestId: 'request_1234567890', paymentMethod: 'cod', shippingAddress: { fullName: 'Test Buyer', line1: '12 Test Road', city: 'Mumbai', state: 'Maharashtra', zip: '400001', country: 'India', phone: '9876543210' } };
  const results = await Promise.allSettled([service.create(body, user), service.create(body, { uid: 'other' })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const order = results.find(r => r.status === 'fulfilled').value.data();
  assert.equal(order.couponDiscountType, 'fixed');
  assert.equal(order.couponDiscountValue, 150);
  assert.equal(order.couponDiscountAmount, 100);
  assert.equal(db.data.get('coupons/promo').usedCount, 1);
  assert.equal(db.data.get('products/dress').stock, 9);
});

test('minimum spend, product scope, inactive coupons and malformed discounts fail closed', async () => {
  const { db, service, coupon } = setup();
  db.data.set('products/dress', { price: 100, stock: 10 });
  const items = [{ productId: 'dress', quantity: 1 }];
  for (const [patch, message] of [
    [{ minimumOrderValue: 101 }, /Minimum order/],
    [{ scope: 'products', productIds: ['other'] }, /does not apply/],
    [{ active: false }, /inactive/],
    [{ discountValue: -10 }, /configuration/],
    [{ discountType: 'unknown' }, /configuration/],
  ]) {
    db.data.set('coupons/promo', { ...coupon, ...patch });
    await assert.rejects(service.quote({ items, couponCode: 'SAVE10' }, { uid: 'buyer' }), message);
  }
  db.data.set('coupons/promo', { ...coupon, minimumOrderValue: 100, scope: 'products', productIds: ['dress'] });
  assert.equal((await service.quote({ items, couponCode: 'SAVE10' }, { uid: 'buyer' })).discount, 10);
  db.data.set('coupons/duplicate', { ...coupon });
  await assert.rejects(service.quote({ items, couponCode: 'SAVE10' }, { uid: 'buyer' }), /Duplicate coupon/);
});
