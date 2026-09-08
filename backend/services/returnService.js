const { fail, text, hash, money } = require('../lib/cod');

const RETURN_DAYS = 7;
const states = {
  requested: ['approved', 'rejected'], approved: ['received', 'rejected'],
  received: ['completed', 'exchange_shipped'], exchange_shipped: ['completed'],
  rejected: [], completed: [],
};
const date = value => value?.toDate?.() || (value ? new Date(value) : null);

function eligibility(order, now = new Date()) {
  const delivered = date(order.deliveredAt || order.statusHistory?.find(item => item.status === 'delivered')?.at);
  const deadline = delivered && new Date(delivered.getTime() + RETURN_DAYS * 86400000);
  const eligible = order.status === 'delivered' && ['paid', 'partially_refunded'].includes(order.paymentStatus) && deadline && Number.isFinite(deadline.getTime()) && now <= deadline && now >= delivered;
  return { eligible: Boolean(eligible), deadline: deadline && Number.isFinite(deadline.getTime()) ? deadline.toISOString() : null, windowDays: RETURN_DAYS };
}

// Allocate the original discount in paise so separate line refunds never exceed
// the paid merchandise total. Shipping is not included in an item refund.
function refundForLine(order, index) {
  const cents = order.items.map(item => Math.round(item.lineTotal * 100));
  const total = cents.reduce((a, b) => a + b, 0);
  const discount = Math.round((order.discount || 0) * 100);
  if (!cents.every(n => Number.isSafeInteger(n) && n >= 0) || !Number.isSafeInteger(discount) || discount < 0 || discount > total) fail('Order totals need store review.', 409);
  const before = cents.slice(0, index).reduce((a, b) => a + b, 0);
  const allocated = total ? Math.round((before + cents[index]) * discount / total) - Math.round(before * discount / total) : 0;
  return (cents[index] - allocated) / 100;
}

function options(product = {}) {
  const sizes = product.sizeOptions?.length ? product.sizeOptions.filter(item => item.available === true).map(item => item.label) : product.sizes || [];
  return { sizes, colors: product.colors || [] };
}

function validateExchange(product, replacement, original) {
  if (!product || product.active === false) fail('This product is not available for exchange.', 409);
  const choices = options(product);
  for (const [field, values] of [['size', choices.sizes], ['color', choices.colors]]) {
    if ((values.length && !values.includes(replacement[field])) || (!values.length && replacement[field])) fail(`Choose an available exchange ${field}.`);
  }
  if (replacement.size === (original.size || '') && replacement.color === (original.color || '')) fail('Choose a different size or colour for an exchange.');
}

function createReturnService({ db }) {
  const orders = db.collection('orders');
  const requests = db.collection('returnRequests');
  const products = db.collection('products');
  const requestId = (orderId, index) => `RET-${hash([orderId, index]).slice(0, 32)}`;

  async function getOrder(id, user) {
    if (!text(id) || id.includes('/')) fail('Invalid order ID.');
    const snap = await orders.doc(id).get();
    if (!snap.exists) fail('Order not found.', 404);
    if (snap.data().userId !== user.uid && user.role !== 'admin') fail('Not authorized.', 403);
    return snap;
  }

  async function listForOrder(id, user) {
    const order = (await getOrder(id, user)).data();
    const found = await requests.where('orderId', '==', id).get();
    const items = await Promise.all(order.items.map(async (item, lineIndex) => {
      const product = await products.doc(item.productId).get();
      return { lineIndex, ...item, refundAmount: refundForLine(order, lineIndex), ...options(product.data()) };
    }));
    return { ...eligibility(order), items, requests: found.docs.map(serialize) };
  }

  async function create(orderId, payload, user) {
    if (!text(orderId) || orderId.includes('/')) fail('Invalid order ID.');
    const index = payload.lineIndex;
    if (!Number.isSafeInteger(index) || index < 0 || index > 49) fail('Select a purchased item.');
    if (!['return', 'exchange'].includes(payload.type)) fail('Choose return or exchange.');
    const reason = text(payload.reason);
    if (reason.length < 10 || reason.length > 1000) fail('Describe the reason in 10 to 1,000 characters.');
    const replacement = { size: text(payload.size), color: text(payload.color) };
    const fingerprint = hash({ type: payload.type, reason, replacement });
    const ref = requests.doc(requestId(orderId, index));
    await db.runTransaction(async tx => {
      const orderSnap = await tx.get(orders.doc(orderId));
      if (!orderSnap.exists) fail('Order not found.', 404);
      const order = orderSnap.data();
      if (order.userId !== user.uid) fail('Only the purchaser can request a return.', 403);
      const existing = await tx.get(ref);
      if (existing.exists) {
        if (existing.data().fingerprint === fingerprint) return;
        fail('A request already exists for this purchased line.', 409);
      }
      if (!eligibility(order).eligible) fail('Requests are available within seven days of delivery for paid orders.', 409);
      const item = order.items[index];
      if (!item || item.returnEligible === false) fail('This item is not eligible for a standard return or exchange.', 409);
      if (payload.type === 'exchange') {
        const product = await tx.get(products.doc(item.productId));
        validateExchange(product.data(), replacement, item);
      }
      const now = new Date();
      tx.set(ref, { orderId, userId: user.uid, customerName: order.customerName || '', lineIndex: index,
        item, type: payload.type, reason, replacement: payload.type === 'exchange' ? replacement : null,
        refundAmount: payload.type === 'return' ? refundForLine(order, index) : 0,
        status: 'requested', fingerprint, createdAt: now, updatedAt: now,
        history: [{ status: 'requested', at: now, by: user.uid, note: 'Request submitted for store review.' }],
      });
    });
    return serialize(await ref.get());
  }

  async function update(id, payload, user) {
    if (user.role !== 'admin') fail('Admin access required.', 403);
    if (!text(id) || id.includes('/')) fail('Invalid request ID.');
    const next = text(payload.status);
    const note = text(payload.note);
    if (note.length > 1000) fail('Keep the update within 1,000 characters.');
    const ref = requests.doc(id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail('Request not found.', 404);
      const request = snap.data();
      if (request.status === next) return;
      if (!states[request.status]?.includes(next) || (next === 'exchange_shipped' && request.type !== 'exchange') || (next === 'completed' && request.type === 'exchange' && request.status !== 'exchange_shipped')) fail('Invalid request status transition.', 409);
      if (['approved', 'rejected'].includes(next) && note.length < 5) fail('Add customer instructions or a reason for this decision.');
      const now = new Date();
      const updates = {};
      if (next === 'received') {
        if (payload.inspected !== true || typeof payload.restock !== 'boolean') fail('Confirm inspection and whether the original item can be restocked.');
        const productRef = products.doc(request.item.productId);
        const product = await tx.get(productRef);
        const quantity = request.item.quantity;
        if (!Number.isSafeInteger(quantity) || quantity < 1) fail('Quantity needs store review.', 409);
        if (payload.restock || request.type === 'exchange') {
          if (!product.exists || !Number.isSafeInteger(product.data().stock) || product.data().stock < 0) fail('Inventory needs store review.', 409);
          let stock = product.data().stock;
          if (request.type === 'exchange') {
            validateExchange(product.data(), request.replacement, request.item);
            // Require replacement stock before adding the returned item. The
            // original size cannot manufacture stock of the requested size.
            if (stock < quantity) fail('Replacement stock is unavailable. Keep the request approved until stock is available.', 409);
            stock -= quantity;
          }
          if (payload.restock) stock += quantity;
          tx.update(productRef, { stock, updatedAt: now });
        }
        Object.assign(updates, { inspectedAt: now, restocked: payload.restock, replacementReserved: request.type === 'exchange' });
      }
      if (next === 'exchange_shipped') {
        const trackingNumber = text(payload.trackingNumber);
        const carrier = text(payload.carrier);
        if (!trackingNumber || trackingNumber.length > 150 || !carrier || carrier.length > 100) fail('Enter the replacement courier and tracking number.');
        Object.assign(updates, { trackingNumber, carrier });
      }
      if (next === 'completed' && request.type === 'return') {
        const reference = text(payload.refundReference);
        if (payload.refundConfirmed !== true || payload.refundAmount !== request.refundAmount || !reference || reference.length > 200) fail('Confirm the exact refund amount and enter the manual refund reference.');
        const orderRef = orders.doc(request.orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) fail('Order not found.', 404);
        const order = orderSnap.data();
        const refundedAmount = money((order.refundedAmount || 0) + request.refundAmount);
        if (!Number.isFinite(refundedAmount) || refundedAmount > order.total) fail('Refund exceeds the remaining order balance.', 409);
        tx.update(orderRef, { refundedAmount, paymentStatus: refundedAmount >= order.total ? 'refunded' : 'partially_refunded', updatedAt: now });
        Object.assign(updates, { refundReference: reference, refundedAt: now, refundedBy: user.uid });
      }
      if (next === 'completed' && request.type === 'exchange' && payload.deliveryConfirmed !== true) fail('Confirm that the replacement was delivered.');
      tx.update(ref, { ...updates, status: next, updatedAt: now,
        history: [...request.history, { status: next, at: now, by: user.uid, note: note || `Request ${next.replaceAll('_', ' ')}.` }],
      });
    });
    return serialize(await ref.get());
  }

  async function listAll(user) {
    if (user.role !== 'admin') fail('Admin access required.', 403);
    return (await requests.get()).docs.map(serialize).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return { create, update, listForOrder, listAll };
}

function serialize(snap) {
  const data = snap.data();
  const result = { id: snap.id, ...data };
  delete result.fingerprint;
  for (const key of ['createdAt', 'updatedAt', 'inspectedAt', 'refundedAt']) if (result[key]) result[key] = date(result[key]).toISOString();
  result.history = data.history.map(entry => ({ ...entry, at: date(entry.at).toISOString() }));
  return result;
}

module.exports = { createReturnService, refundForLine, eligibility };
