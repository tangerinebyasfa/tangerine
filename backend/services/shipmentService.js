const cod = require('../lib/cod');

// All order-level Shiprocket logic lives here; every remote call goes through
// lib/shiprocket.js. Creation is fire-and-forget from the payment flow, so a
// Shiprocket outage can never fail a payment or an order — failures are
// recorded on the order and picked up again by the retry sweep.
function createShipmentService({ db, shiprocket, retryDelays = [1000, 3000] } = {}) {
  const orders = db.collection('orders');
  const products = db.collection('products');

  const MAX_ATTEMPTS = 20;
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const IN_FLIGHT_MS = 5 * 60 * 1000;
  const TRACKING_TTL_MS = 5 * 60 * 1000;
  const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
  const SWEEP_BATCH = 20;
  const ELIGIBLE_STATUSES = ['pending', 'processing'];

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const nowIso = () => new Date().toISOString();

  function toTime(value) {
    if (!value) return null;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (value instanceof Date) return value.getTime();
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }

  function positive(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function fail(message, status = 400) {
    throw Object.assign(new Error(message), { status });
  }

  // cod.text only accepts strings, but webhook ids arrive as numbers.
  function keyOf(value) {
    return value === null || value === undefined ? '' : cod.text(String(value));
  }

  // An order may only be handed to Shiprocket while it is still fulfilable
  // and paid (for online payments), within the retry age/attempt budget.
  function canCreate(order, now = Date.now()) {
    if (!order || !shiprocket.isConfigured()) return false;
    if (!ELIGIBLE_STATUSES.includes(order.status)) return false;
    if (order.paymentMethod === 'razorpay' && order.paymentStatus !== 'paid') return false;
    const created = toTime(order.createdAt);
    if (created && now - created > MAX_AGE_MS) return false;
    const shipment = order.shiprocket;
    if (!shipment) return true;
    if (shipment.status === 'created' || shipment.status === 'cancelled') return false;
    if (Number(shipment.attempts || 0) >= MAX_ATTEMPTS) return false;
    if (shipment.status === 'creating') {
      const updated = toTime(shipment.updatedAt);
      // Another trigger is mid-flight; never start a parallel create.
      if (updated && now - updated < IN_FLIGHT_MS) return false;
    }
    return true;
  }

  // Weight and height scale with quantity (folded apparel stacks); length and
  // breadth take the widest item. Blanks (legacy products) fall back to
  // Shiprocket defaults from env.
  async function computePackage(order) {
    const defaults = shiprocket.packageDefaults();
    const items = Array.isArray(order.items) ? order.items : [];
    const ids = [...new Set(items.map(item => item.productId))];
    const snapshots = await Promise.all(ids.map(id => products.doc(id).get()));
    const productMap = new Map(snapshots.filter(snap => snap.exists).map(snap => [snap.id, snap.data()]));
    let weight = 0;
    let length = 0;
    let breadth = 0;
    let height = 0;
    for (const item of items) {
      const product = productMap.get(item.productId) || {};
      const quantity = Number(item.quantity) || 1;
      weight += positive(product.weight, defaults.weight) * quantity;
      length = Math.max(length, positive(product.length, defaults.length));
      breadth = Math.max(breadth, positive(product.breadth, defaults.breadth));
      height += positive(product.height, defaults.height) * quantity;
    }
    return {
      weight: Math.round(weight * 1000) / 1000,
      length: Math.round(length * 100) / 100,
      breadth: Math.round(breadth * 100) / 100,
      height: Math.round(Math.max(height, defaults.height) * 100) / 100,
    };
  }

  // Claims the order inside a transaction (status -> 'creating') so concurrent
  // triggers — browser verify + webhook — cannot create two Shiprocket orders.
  async function claim(id, now) {
    const ref = orders.doc(id);
    let order = null;
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const data = snap.data();
      if (!canCreate(data, now.getTime())) return;
      const shipment = data.shiprocket || {};
      order = { ...data, shiprocket: shipment };
      tx.update(ref, {
        shiprocket: { ...shipment, status: 'creating', lastError: null, updatedAt: now.toISOString() },
        // Stays true until creation succeeds, so a crash mid-flight is still
        // recovered by the sweep.
        shipmentRetryNeeded: true,
        updatedAt: now,
      });
    });
    return order;
  }

  async function persistCreated(id, order, parcel, result, triesUsed) {
    const stamp = nowIso();
    await orders.doc(id).update({
      shiprocket: {
        ...(order.shiprocket || {}),
        status: 'created',
        duplicate: result.duplicate === true,
        orderId: result.srOrderId ?? null,
        shipmentId: result.shipmentId ?? null,
        package: parcel,
        attempts: Number(order.shiprocket?.attempts || 0) + triesUsed,
        lastError: null,
        createdAt: stamp,
        updatedAt: stamp,
      },
      shipmentRetryNeeded: false,
      shiprocketSrOrderId: result.srOrderId ? String(result.srOrderId) : null,
      updatedAt: new Date(),
    });
  }

  async function persistFailure(id, order, triesUsed, err) {
    const stamp = nowIso();
    await orders.doc(id).update({
      shiprocket: {
        ...(order.shiprocket || {}),
        status: 'error',
        attempts: Number(order.shiprocket?.attempts || 0) + triesUsed,
        lastError: shiprocket.describeShiprocketError(err),
        updatedAt: stamp,
      },
      shipmentRetryNeeded: true,
      updatedAt: new Date(),
    });
  }

  // Inline (payment-flow) creates run on serverless functions with a hard
  // runtime cap (Vercel kills at ~10s), so they get one attempt on a tighter
  // timeout; the sweep owns retries and self-healing. The Firestore-shared
  // Shiprocket session means this budget is almost entirely the create itself.
  const INLINE_TIMEOUT_MS = 8000;

  // One guarded creation pass: claim, then create. Inline mode makes exactly
  // one attempt so it always fits the serverless budget; sweep mode keeps the
  // immediate retries with their backoff delays.
  // Returns the updated document, or null when nothing was done.
  async function createNow(id, { inline = false } = {}) {
    if (!shiprocket.isConfigured()) return null;
    const claimed = await claim(id, new Date());
    if (!claimed) return null;

    const totalAttempts = inline ? 1 : retryDelays.length + 1;
    let lastError = null;
    let triesUsed = 0;
    for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
      if (!inline && attempt > 0) await delay(retryDelays[attempt - 1]);
      triesUsed += 1;
      try {
        const parcel = await computePackage(claimed);
        const result = await shiprocket.createAdhocOrder({
          orderId: claimed.orderId || id,
          placedAt: claimed.createdAt,
          paymentMethod: claimed.paymentMethod,
          customerEmail: claimed.customerEmail,
          subtotal: claimed.subtotal,
          shippingAddress: claimed.shippingAddress,
          items: claimed.items,
          package: parcel,
        }, { timeout: inline ? INLINE_TIMEOUT_MS : undefined });
        await persistCreated(id, claimed, parcel, result, triesUsed);
        return orders.doc(id).get();
      } catch (err) {
        lastError = err;
      }
    }
    await persistFailure(id, claimed, triesUsed, lastError);
    console.error(`Shiprocket order creation failed for ${id}: ${shiprocket.describeShiprocketError(lastError)}`);
    return null;
  }

  // Auto-trigger from the payment flow. Serverless-safe: a single fast attempt
  // so the create finishes inside the function's runtime budget. Never throws:
  // callers fire and forget, and the sweep picks up any failure.
  async function onOrderReady(input) {
    const id = typeof input === 'string' ? input : input?.id;
    if (!id) return null;
    try {
      return await createNow(id, { inline: true });
    } catch (err) {
      console.error(`Shiprocket auto-create failed for ${id}: ${shiprocket.describeShiprocketError(err)}`);
      return null;
    }
  }

  // Periodic self-healing for orders whose creation failed or was interrupted.
  async function sweepOnce() {
    if (!shiprocket.isConfigured()) return { checked: 0, created: 0 };
    const snapshot = await orders.where('shipmentRetryNeeded', '==', true).limit(SWEEP_BATCH).get();
    let checked = 0;
    let created = 0;
    for (const doc of snapshot.docs) {
      checked += 1;
      const data = doc.data();
      if (!canCreate(data)) {
        // Finished with this order (cancelled, shipped, aged out, or out of
        // attempts): clear the flag so it stops filling the sweep window.
        const spent = Number(data.shiprocket?.attempts || 0) >= MAX_ATTEMPTS;
        const ineligibleStatus = !ELIGIBLE_STATUSES.includes(data.status);
        if (spent || ineligibleStatus) {
          try {
            await doc.ref.update({ shipmentRetryNeeded: false, updatedAt: new Date() });
          } catch {
            // A concurrent write won; the next sweep will re-evaluate.
          }
        }
        continue;
      }
      const result = await createNow(doc.id);
      if (result) created += 1;
    }
    return { checked, created };
  }

  function startSweep({ intervalMs = SWEEP_INTERVAL_MS } = {}) {
    if (!shiprocket.isConfigured()) return () => {};
    const timer = setInterval(() => {
      sweepOnce().catch(err => console.error(`Shiprocket sweep failed: ${err.message}`));
    }, intervalMs);
    if (typeof timer.unref === 'function') timer.unref();
    return () => clearInterval(timer);
  }

  // Maps Shiprocket status labels onto our order state machine. Ambiguous or
  // return-related labels intentionally suggest nothing.
  function suggestStatus(orderStatus, tracking) {
    if (!tracking) return null;
    const label = `${tracking.currentStatus || ''} ${tracking.status || ''}`.trim().toLowerCase();
    if (!label) return null;
    if (label.includes('rto') || label.includes('return to seller') || label.includes('undeliver') || label.includes('not deliver')) return null;
    // Must precede the delivered check: "out for delivery" contains "deliver".
    if (label.includes('out for delivery')) return 'shipped';
    if (label.includes('deliver')) return 'delivered';
    if (label.includes('transit') || label.includes('picked') || label.includes('manifest') || label.includes('dispatch')) return 'shipped';
    return null;
  }

  function mergeTracking(order, tracked) {
    const shipment = order.shiprocket ? { ...order.shiprocket } : null;
    const stamp = nowIso();
    const previous = shipment?.tracking || {};
    const tracking = {
      ...previous,
      ...(tracked
        ? {
            awb: tracked.awb || previous.awb || null,
            courierName: tracked.courierName || previous.courierName || null,
            status: tracked.status || previous.status || '',
            currentStatus: tracked.currentStatus || previous.currentStatus || '',
            edd: tracked.edd || previous.edd || '',
            trackUrl: tracked.trackUrl || previous.trackUrl || '',
            activities: tracked.activities?.length ? tracked.activities : previous.activities || [],
          }
        : {}),
      updatedAt: stamp,
    };
    if (!shipment) {
      if (!tracked) return null;
      // Tracking found for an order with no local record (created manually in
      // the Shiprocket panel): adopt it so the customer still sees it.
      return {
        shiprocket: {
          status: 'created',
          duplicate: true,
          awb: tracking.awb || null,
          courierName: tracking.courierName || null,
          etd: tracking.edd || null,
          tracking,
          createdAt: stamp,
          updatedAt: stamp,
        },
        shiprocketAwb: tracking.awb || null,
      };
    }
    shipment.tracking = tracking;
    shipment.updatedAt = stamp;
    if (tracking.awb) shipment.awb = tracking.awb;
    if (tracking.courierName) shipment.courierName = tracking.courierName;
    if (tracking.edd) shipment.etd = tracking.edd;
    return {
      shiprocket: shipment,
      shiprocketAwb: shipment.awb || null,
    };
  }

  // Pulls live tracking for an order using OUR order id (works regardless of
  // where the courier was assigned). Recent pulls are throttled.
  async function refreshTracking(id) {
    if (!cod.text(id) || id.includes('/')) fail('Invalid order ID.');
    if (!shiprocket.isConfigured()) fail('Shipping (Shiprocket) is not configured yet.', 503);
    const ref = orders.doc(id);
    const snap = await ref.get();
    if (!snap.exists) fail('Order not found.', 404);
    const order = snap.data();

    const lastProbe = Math.max(
      toTime(order.shiprocket?.tracking?.updatedAt) || 0,
      toTime(order.shiprocketProbeAt) || 0
    );
    if (lastProbe && Date.now() - lastProbe < TRACKING_TTL_MS) {
      return { order: snap, suggestedStatus: null, throttled: true };
    }

    let tracked = await shiprocket.trackByOrderId(order.orderId || id).catch(err => {
      throw Object.assign(new Error(shiprocket.describeShiprocketError(err)), { status: err.status || 502 });
    });
    if ((!tracked || !tracked.awb) && order.shiprocket?.awb) {
      tracked = (await shiprocket.trackAwb(order.shiprocket.awb).catch(() => tracked)) || tracked;
    }

    const merged = mergeTracking(order, tracked);
    const update = { shiprocketProbeAt: nowIso(), updatedAt: new Date() };
    if (merged) Object.assign(update, merged);
    await ref.update(update);
    const updated = await ref.get();
    return {
      order: updated,
      suggestedStatus: suggestStatus(updated.data().status, tracked),
      throttled: false,
    };
  }

  // Shiprocket tracking webhook (Settings -> API -> Webhooks): a push the
  // moment the warehouse assigns a courier or a scan happens. Their payload's
  // `order_id` may echo OUR id or Shiprocket's own numeric id depending on the
  // webhook type, so every field is tried against every stored id.
  async function applyTrackingPayload(payload) {
    if (!payload || typeof payload !== 'object') return { matched: false };
    const ourId = keyOf(payload.order_id);
    const srOrderId = keyOf(payload.sr_order_id || payload.shiprocket_order_id);
    const awb = keyOf(payload.awb_code || payload.awb);

    let ref = null;
    if (ourId) {
      const byOrderId = await orders.where('orderId', '==', ourId).limit(1).get();
      if (!byOrderId.empty) ref = byOrderId.docs[0].ref;
      if (!ref) {
        const bySr = await orders.where('shiprocketSrOrderId', '==', ourId).limit(1).get();
        if (!bySr.empty) ref = bySr.docs[0].ref;
      }
    }
    if (!ref && srOrderId) {
      const bySr = await orders.where('shiprocketSrOrderId', '==', srOrderId).limit(1).get();
      if (!bySr.empty) ref = bySr.docs[0].ref;
    }
    if (!ref && awb) {
      const byAwb = await orders.where('shiprocketAwb', '==', awb).limit(1).get();
      if (!byAwb.empty) ref = byAwb.docs[0].ref;
    }
    if (!ref) return { matched: false };

    const snap = await ref.get();
    const order = snap.data();
    const tracked = shiprocket.normalizeTrackPayload(payload);
    const merged = mergeTracking(order, tracked);
    if (!merged) return { matched: false };
    await ref.update({ ...merged, updatedAt: new Date() });
    return {
      matched: true,
      order: await ref.get(),
      suggestedStatus: suggestStatus(order.status, tracked),
    };
  }

  // Called when a website order is cancelled: mirrors the cancellation into
  // Shiprocket. Failures (already dispatched, network) are logged, never thrown.
  async function onOrderCancelled(id, reason = 'Order cancelled on the store.') {
    if (!id || !shiprocket.isConfigured()) return null;
    try {
      const snap = await orders.doc(id).get();
      if (!snap.exists) return null;
      const shipment = snap.data().shiprocket;
      if (!shipment || shipment.status !== 'created' || !shipment.orderId) return null;
      await shiprocket.cancelAdhocOrders({ srOrderIds: [shipment.orderId], reason });
      const stamp = nowIso();
      await orders.doc(id).update({
        shiprocket: { ...shipment, status: 'cancelled', updatedAt: stamp },
        shipmentRetryNeeded: false,
        updatedAt: new Date(),
      });
      return orders.doc(id).get();
    } catch (err) {
      console.error(`Shiprocket cancel failed for ${id}: ${shiprocket.describeShiprocketError(err)}`);
      return null;
    }
  }

  return {
    onOrderReady,
    onOrderCancelled,
    createNow,
    sweepOnce,
    startSweep,
    refreshTracking,
    applyTrackingPayload,
    computePackage,
    suggestStatus,
    canCreate,
  };
}

module.exports = { createShipmentService };
