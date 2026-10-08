const cod = require('../lib/cod');

// Dependency injection allows transaction behavior to be tested without live writes.
function createOrderService({ db, validateCouponForOrder, razorpay, shipment } = {}) {
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
      const found = await tx.get(coupons.where('code', '==', couponCode).limit(2));
      if (found.empty) cod.fail('Coupon not found.');
      if (found.docs.length !== 1) cod.fail('Duplicate coupon configuration. Please contact the store.', 409);
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

  // Returns the per-product quantities this order reserved, for release.
  function reservedQuantities(items) {
    const quantities = new Map();
    for (const item of cod.normalizeItems(items)) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
    return quantities;
  }

  // Restores stock and coupon usage. Every read happens before any write,
  // because Firestore rejects reads that follow a write in a transaction.
  async function release(tx, order, now) {
    const quantities = reservedQuantities(order.items || []);
    const snapshots = await Promise.all([...quantities.keys()].map(id => tx.get(products.doc(id))));
    for (const product of snapshots) {
      if (!product.exists || !Number.isSafeInteger(product.data().stock) || product.data().stock < 0) cod.fail('Inventory needs store review before cancellation.', 409);
    }
    const couponDoc = order.couponCode ? (await tx.get(coupons.where('code', '==', order.couponCode).limit(1))).docs[0] : null;
    for (const product of snapshots) tx.update(product.ref, { stock: product.data().stock + quantities.get(product.id), updatedAt: now });
    // Give the coupon back too, otherwise abandoned checkouts burn its usage limit.
    if (couponDoc) tx.update(couponDoc.ref, { usedCount: Math.max(0, Number(couponDoc.data().usedCount || 0) - 1), updatedAt: now });
  }

  async function create(payload, user) {
    const paymentMethod = cod.text(payload.paymentMethod);
    if (paymentMethod !== 'cod' && paymentMethod !== 'razorpay') cod.fail('Choose cash on delivery or online payment.');
    // Cash on delivery never touches the gateway, so it must keep working even
    // when the Razorpay keys are missing or the gateway is unreachable.
    if (paymentMethod === 'razorpay' && !razorpay?.isConfigured()) cod.fail('Payments are not configured yet.', 503);
    const items = cod.normalizeItems(payload.items);
    const shippingAddress = cod.address(payload.shippingAddress);
    const requestId = cod.text(payload.requestId);
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(requestId)) cod.fail('A checkout request ID is required. Reload checkout and retry.');
    const couponCode = cod.text(payload.couponCode).toUpperCase();
    const quoteId = cod.text(payload.quoteId);
    if (!/^[a-f0-9]{64}$/.test(quoteId)) cod.fail('Review the latest checkout total before ordering.');
    const requestHash = cod.hash({ items, shippingAddress, couponCode, quoteId, paymentMethod });
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
        coupon: coupon || null, couponDiscountType: coupon?.discountType || null, couponDiscountValue: coupon?.discountValue ?? null,
        couponId: coupon?.id || null, discountCode: coupon?.code || null, couponDiscountAmount: quote.discount,
        paymentMethod, paymentStatus: 'pending', status: 'pending',
        paymentProvider: paymentMethod === 'cod' ? 'cash_on_delivery' : 'razorpay', razorpayOrderId: null, razorpayPaymentId: null,
        amountCollected: 0, inventoryReserved: true, requestHash,
        statusHistory: [{ status: 'pending', at: now, by: user.uid, note: paymentMethod === 'cod' ? 'Order placed, pay on delivery' : 'Order placed, awaiting payment' }],
        source: 'checkout', createdAt: now, updatedAt: now,
      });
    });
    const placed = await ref.get();

    // Cash on delivery is collected at the door, so no gateway order is opened.
    // It ships as soon as it is placed; Shiprocket creation is fire-and-forget
    // so an outage there can never fail the order itself.
    if (paymentMethod === 'cod') {
      shipment?.onOrderReady?.(orderId)?.catch?.(err => console.error(`Shiprocket trigger failed for ${orderId}: ${err.message}`));
      return placed;
    }

    // Create the Razorpay order outside the transaction so a slow gateway call
    // never holds a Firestore write lock. Retries reuse the stored order id.
    if (placed.data().razorpayOrderId) return placed;
    try {
      const remote = await razorpay.createOrder({
        amount: placed.data().total,
        receipt: orderId,
        notes: { orderId, userId: user.uid },
      });
      await ref.update({ razorpayOrderId: remote.id, updatedAt: new Date() });
    } catch (err) {
      // Never strand reserved stock when the gateway rejects order creation.
      await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const now = new Date();
        await release(tx, snap.data(), now);
        tx.update(ref, {
          paymentStatus: 'failed', status: 'cancelled', inventoryReserved: false,
          cancelledAt: now, updatedAt: now,
          statusHistory: [...(snap.data().statusHistory || []), { status: 'cancelled', at: now, by: 'system', note: 'Payment could not be started' }],
        });
      });
      throw Object.assign(new Error('Could not start the payment. Please retry.'), { status: 502 });
    }
    return ref.get();
  }

  // Confirms a successful payment. Idempotent so a webhook and the browser
  // callback racing each other cannot double-apply.
  //
  // The browser callback must carry a valid HMAC signature, verified against the
  // razorpayOrderId we stored. A webhook is already authenticated by its own
  // HMAC over the raw body, so it instead confirms the payment against Razorpay
  // and must match the amount we expected.
  async function markPaid(id, { razorpayOrderId, razorpayPaymentId, razorpaySignature, source = 'checkout' }, user) {
    if (!cod.text(id) || id.includes('/')) cod.fail('Invalid order ID.');
    if (!razorpay?.isConfigured()) cod.fail('Payments are not configured yet.', 503);
    const fromWebhook = source === 'webhook';
    if (!razorpayPaymentId) cod.fail('Payment could not be verified. Contact the store if you were charged.', 400);
    let paidPaise = null;
    if (fromWebhook) {
      // The signature already proves authenticity, but confirm the payment
      // itself exists, is settled, and belongs to the order we stored.
      const payment = await razorpay.fetchPayment(razorpayPaymentId).catch(() => null);
      if (!payment || (payment.status !== 'captured' && payment.status !== 'authorized')) cod.fail('Payment could not be verified. Contact the store if you were charged.', 400);
      if (payment.order_id !== razorpayOrderId) cod.fail('Payment could not be verified. Contact the store if you were charged.', 400);
      if (!Number.isSafeInteger(payment.amount) || payment.amount < 1) cod.fail('Payment could not be verified. Contact the store if you were charged.', 400);
      paidPaise = payment.amount;
    }
    const ref = orders.doc(id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) cod.fail('Order not found.', 404);
      const order = snap.data();
      // Webhook calls carry no user; the browser callback must be the owner.
      if (!fromWebhook && (!user || order.userId !== user.uid)) cod.fail('Not authorized.', 403);
      // A cash order has no gateway reference, so it can never be settled here.
      if (order.paymentMethod !== 'razorpay') cod.fail('This order is not an online payment.', 409);
      if (order.paymentStatus === 'paid') return;
      if (order.paymentStatus === 'refunded' || order.paymentStatus === 'partially_refunded') return;
      if (order.status === 'cancelled') cod.fail('This order was cancelled. Contact the store if you were charged.', 409);
      // Compare against the stored id so a swapped order id cannot verify.
      if (!fromWebhook && !razorpay.verifyPaymentSignature({ razorpayOrderId: order.razorpayOrderId, razorpayPaymentId, razorpaySignature })) cod.fail('Payment could not be verified. Contact the store if you were charged.', 400);
      // A partial capture must not mark the whole order settled.
      if (paidPaise !== null && paidPaise !== Math.round(order.total * 100)) cod.fail('The captured amount does not match the order total. Contact the store.', 409);
      const now = new Date();
      tx.update(ref, {
        paymentStatus: 'paid', razorpayPaymentId, razorpayOrderId: order.razorpayOrderId,
        amountCollected: order.total, paidAt: now, updatedAt: now, paymentConfirmedBy: source,
        statusHistory: [...(order.statusHistory || []), { status: 'paid', at: now, by: source, note: `Payment received (${razorpayPaymentId})` }],
      });
    });
    const paid = await ref.get();

    // The order is now settled, so hand it to Shiprocket. The claim inside
    // onOrderReady makes this safe when the browser callback and the webhook
    // both try to trigger it.
    shipment?.onOrderReady?.(id)?.catch?.(err => console.error(`Shiprocket trigger failed for ${id}: ${err.message}`));
    return paid;
  }

  // Releases stock and coupon when the customer abandons or fails payment.
  async function releaseUnpaid(id, user, { reason = 'Payment was not completed.' } = {}) {
    if (!cod.text(id) || id.includes('/')) cod.fail('Invalid order ID.');
    const ref = orders.doc(id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) cod.fail('Order not found.', 404);
      const order = snap.data();
      if (order.userId !== user.uid && user.role !== 'admin') cod.fail('Not authorized.', 403);
      if (order.paymentStatus === 'paid') cod.fail('This order is already paid. Cancel it to request a refund.', 409);
      if (!order.inventoryReserved) return;
      const now = new Date();
      await release(tx, order, now);
      tx.update(ref, {
        paymentStatus: 'failed', status: 'cancelled', inventoryReserved: false,
        cancelledAt: now, updatedAt: now, cancelReason: reason,
        statusHistory: [...(order.statusHistory || []), { status: 'cancelled', at: now, by: user.uid, note: reason }],
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
    // Declared outside the transaction: a gateway call inside one can abort and
    // get retried, which would risk a duplicate refund.
    let refund = null;
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) cod.fail('Order not found.', 404);
      const order = snap.data();
      if (customerCancellation && order.userId !== user.uid) cod.fail('Not authorized.', 403);
      if (order.status === next) return; // Safe retry: never restore inventory twice.
      if (!cod.transitions[order.status]?.includes(next)) cod.fail('This order cannot make that status change. Cancellation is available only before shipment.', 409);
      // A prepaid order must be settled before it moves, because the store has
      // already taken the money. A cash order is collected at the door, so it
      // may advance as soon as it is placed and is marked paid on delivery.
      const isCod = order.paymentMethod === 'cod';
      if (order.paymentStatus !== 'paid' && !isCod) cod.fail('Payment for this order is not confirmed yet.', 409);
      if (next === 'cancelled' && !order.inventoryReserved) cod.fail('This order is already cancelled.', 409);
      const now = new Date();
      // Cash collected at the door settles the order on the delivered transition.
      const cashCollected = isCod && next === 'delivered' && order.paymentStatus === 'pending';
      if (next === 'cancelled') {
        await release(tx, order, now);
        const alreadyRefunded = cod.money(order.refundedAmount || 0);
        const amount = cod.money(order.total - alreadyRefunded);
        if (order.razorpayPaymentId && amount > 0) refund = { paymentId: order.razorpayPaymentId, amount };
        else if (!order.razorpayPaymentId) refund = { manual: true };
      }
      tx.update(ref, {
        status: next, paymentStatus: next === 'cancelled' ? 'cancelled' : cashCollected ? 'paid' : order.paymentStatus,
        ...(next === 'cancelled' ? { inventoryReserved: false, cancelledAt: now } : {}),
        ...(cashCollected ? { amountCollected: order.total, paidAt: now, paymentConfirmedBy: 'cash_on_delivery' } : {}),
        ...(next === 'delivered' ? { deliveredAt: now } : {}),
        updatedAt: now, statusUpdatedAt: now, statusUpdatedBy: user.uid,
        statusHistory: [...(order.statusHistory || []), { status: next, at: now, by: user.uid, note: next === 'delivered' ? 'Delivered' : `Order ${next}` }],
      });
    });
    if (next === 'cancelled') {
      // Mirror the cancellation into Shiprocket so it stops appearing in the
      // Shiprocket panel. Fire-and-forget: a remote failure must not undo the
      // website cancellation.
      shipment?.onOrderCancelled?.(id, payload?.cancelReason || 'Order cancelled on the store.')?.catch?.(err => console.error(`Shiprocket cancel trigger failed for ${id}: ${err.message}`));
    }
    if (refund) {
      if (refund.manual) {
        // Cancelled before payment: nothing was collected, so nothing to refund.
        await ref.update({ paymentStatus: 'cancelled', refundPending: false, updatedAt: new Date() });
      } else {
        try {
          const receipt = await razorpay.refundPayment({ paymentId: refund.paymentId, amount: refund.amount, notes: { orderId: id, reason: 'order_cancelled' } });
          // Only claim the money is back once the gateway has confirmed it.
          await ref.update({ paymentStatus: 'refunded', razorpayRefundId: receipt.id, refundedAmount: refund.amount, refundPending: false, refundError: null, updatedAt: new Date() });
        } catch (err) {
          // The cancellation stands; flag it so staff can refund from the dashboard.
          await ref.update({ paymentStatus: 'cancelled', refundPending: true, refundError: razorpay.describeGatewayError(err), updatedAt: new Date() });
        }
      }
    }
    return ref.get();
  }
  return { quote, create, update, recover, markPaid, releaseUnpaid };
}

module.exports = { createOrderService };
