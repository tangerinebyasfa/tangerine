const cod = require('../lib/cod');

// Dependency injection allows transaction behavior to be tested without live writes.
function createOrderService({ db, validateCouponForOrder }) {
  const orders = db.collection('orders');
  const products = db.collection('products');
  const coupons = db.collection('coupons');

  async function calculate(tx, items, couponCode, user) {
    const ids = [...new Set(items.map(i => i.productId))];
    const snapshots = await Promise.all(ids.map(id => tx.get(products.doc(id))));
    const productMap = new Map(snapshots.filter(s => s.exists).map(s => [s.id, s.data()]));
    const { lines, quantities } = cod.catalogItems(items, productMap);
    const subtotal = cod.money(lines.reduce((sum, i) => sum + i.lineTotal, 0));
    let coupon = null;
    let couponDoc = null;
    if (couponCode) {
      const found = await tx.get(coupons.where('code', '==', couponCode).limit(1));
      if (found.empty) cod.fail('Coupon not found.');
      couponDoc = found.docs[0];
      coupon = await validateCouponForOrder({ code: couponCode, userId: user.uid, items: lines, productMap, subtotal, transaction: tx, couponDocument: couponDoc });
    }
    const discount = cod.money(Math.min(subtotal, coupon?.discountAmount || 0));
    if (!Number.isFinite(discount) || discount < 0) cod.fail('Invalid coupon configuration.', 409);
    const quote = { items: lines, subtotal, shipping: cod.SHIPPING, discount, total: cod.money(subtotal + cod.SHIPPING - discount), currency: 'INR', couponCode: coupon?.code || null };
    quote.quoteId = cod.hash(quote);
    return { quote, quantities, snapshots, coupon, couponDoc };
  }

  async function quote(payload, user) {
    const items = cod.normalizeItems(payload.items);
    return db.runTransaction(async tx => (await calculate(tx, items, cod.text(payload.couponCode).toUpperCase(), user)).quote);
  }

  async function create(payload, user) {
    if (payload.paymentMethod !== 'cod') cod.fail('Only cash on delivery is available.');
    const items = cod.normalizeItems(payload.items);
    const shippingAddress = cod.address(payload.shippingAddress);
    const requestId = cod.text(payload.requestId);
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(requestId)) cod.fail('A checkout request ID is required. Reload checkout and retry.');
    const couponCode = cod.text(payload.couponCode).toUpperCase();
    const quoteId = cod.text(payload.quoteId);
    if (!/^[a-f0-9]{64}$/.test(quoteId)) cod.fail('Review the latest checkout total before ordering.');
    const requestHash = cod.hash({ items, shippingAddress, couponCode, quoteId });
    const orderId = `TGNR-${cod.hash([user.uid, requestId]).slice(0, 32).toUpperCase()}`;
    const ref = orders.doc(orderId);
    await db.runTransaction(async tx => {
      const existing = await tx.get(ref);
      if (existing.exists) {
        if (existing.data().requestHash !== requestHash) cod.fail('This checkout request was already used. Please start a new checkout.', 409);
        return;
      }
      const result = await calculate(tx, items, couponCode, user);
      const { quote, quantities, snapshots, coupon, couponDoc } = result;
      if (quote.quoteId !== quoteId) cod.fail('Prices or discounts changed. Refresh the total and review it before ordering.', 409);
      const now = new Date();
      // All reads, including coupon usage checks, must precede writes.
      if (couponDoc) tx.update(couponDoc.ref, { usedCount: Number(couponDoc.data().usedCount || 0) + 1, updatedAt: now });
      for (const snap of snapshots) tx.update(snap.ref, { stock: snap.data().stock - quantities.get(snap.id), updatedAt: now });
      tx.set(ref, {
        ...quote, orderId, orderNumber: orderId, userId: user.uid, userUid: user.uid,
        customerEmail: user.email || '', userEmail: user.email || '', customerName: shippingAddress.fullName,
        customerPhone: shippingAddress.phone, userPhone: shippingAddress.phone, shippingAddress,
        shippingAddressSummary: Object.values(shippingAddress).filter(Boolean).join(', '),
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        couponId: coupon?.id || null, discountCode: coupon?.code || null, couponDiscountAmount: quote.discount,
        paymentMethod: 'cod', paymentStatus: 'pending', status: 'pending',
        amountCollected: 0, inventoryReserved: true, requestHash,
        statusHistory: [{ status: 'pending', at: now, by: user.uid, note: 'Cash-on-delivery order placed' }],
        source: 'checkout', createdAt: now, updatedAt: now,
      });
    });
    return ref.get();
  }

  async function recover(requestId, user) {
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(requestId)) cod.fail('Invalid checkout request ID.');
    const id = `TGNR-${cod.hash([user.uid, requestId]).slice(0, 32).toUpperCase()}`;
    const snap = await orders.doc(id).get();
    return snap.exists ? snap : null;
  }

  async function update(id, payload, user, customerCancellation = false) {
    if (!cod.text(id) || id.includes('/')) cod.fail('Invalid order ID.');
    const next = customerCancellation ? 'cancelled' : cod.text(payload.status);
    if (!Object.hasOwn(cod.transitions, next)) cod.fail('Invalid order status.');
    if (!customerCancellation && user.role !== 'admin') cod.fail('Admin access required.', 403);
    const ref = orders.doc(id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) cod.fail('Order not found.', 404);
      const order = snap.data();
      if (customerCancellation && order.userId !== user.uid) cod.fail('Not authorized.', 403);
      if (order.status === next) return; // Safe retry: never restore inventory twice.
      if (!cod.transitions[order.status]?.includes(next)) cod.fail('This order cannot make that status change. Cancellation is available only before shipment.', 409);
      if (order.paymentMethod !== 'cod' || order.paymentStatus !== 'pending') cod.fail('This order requires a manual payment review.', 409);
      if (next === 'delivered' && (payload.cashCollected !== true || typeof payload.amountCollected !== 'number' || !Number.isFinite(payload.amountCollected) || Math.round(payload.amountCollected * 100) !== Math.round(order.total * 100))) cod.fail('Confirm collection of the exact order total before marking delivered.');
      const now = new Date();
      if (next === 'cancelled') {
        const quantities = new Map();
        for (const item of cod.normalizeItems(order.items)) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
        const snapshots = await Promise.all([...quantities.keys()].map(id => tx.get(products.doc(id))));
        for (const product of snapshots) {
          if (!product.exists || !Number.isSafeInteger(product.data().stock) || product.data().stock < 0) cod.fail('Inventory needs store review before cancellation.', 409);
        }
        for (const product of snapshots) tx.update(product.ref, { stock: product.data().stock + quantities.get(product.id), updatedAt: now });
      }
      tx.update(ref, {
        status: next, paymentStatus: next === 'delivered' ? 'paid' : next === 'cancelled' ? 'cancelled' : 'pending',
        ...(next === 'delivered' ? { amountCollected: order.total, cashCollectedAt: now, cashCollectedBy: user.uid, deliveredAt: now } : {}),
        ...(next === 'cancelled' ? { inventoryReserved: false, cancelledAt: now } : {}),
        updatedAt: now, statusUpdatedAt: now, statusUpdatedBy: user.uid,
        statusHistory: [...(order.statusHistory || []), { status: next, at: now, by: user.uid, note: next === 'delivered' ? 'Delivered; cash collection confirmed' : `Order ${next}` }],
      });
    });
    return ref.get();
  }
  return { quote, create, update, recover };
}

module.exports = { createOrderService };
