const express = require("express");
const { db } = require("../config/firebaseAdmin");
const { createOrderService } = require("../services/orderService");
const { validateCouponForOrder } = require("../controllers/couponsController");
const razorpay = require("../lib/razorpay");
const cod = require("../lib/cod");

const service = createOrderService({ db, validateCouponForOrder, razorpay });
const orders = db.collection("orders");

// Razorpay sends its own order id, not ours. Resolve ours by the gateway id we
// stored at checkout, falling back to the receipt (which we set to our id).
// `payload` is the unwrapped body, so entity shapes differ per event:
// payment.captured uses payment.entity, order.paid uses order.entity.
async function findOrderRef(payload) {
  const orderEntity = payload?.order?.entity || {};
  const payment = payload?.payment?.entity || orderEntity.payments?.entity || orderEntity;
  const gatewayOrderId = cod.text(payment.order_id) || cod.text(payload?.order_id);
  if (gatewayOrderId) {
    const byGateway = await orders.where("razorpayOrderId", "==", gatewayOrderId).limit(1).get();
    if (!byGateway.empty) return byGateway.docs[0].ref;
  }
  const receipt = cod.text(payload?.receipt) || cod.text(payment.receipt) || cod.text(payment.notes?.orderId);
  if (receipt) {
    const byReceipt = await orders.doc(receipt).get();
    if (byReceipt.exists) return byReceipt.ref;
  }
  return null;
}

const router = express.Router();

// Mounted above express.json() so the raw body survives for signature checks.
router.post("/", async (req, res) => {
  // The raw buffer is what the HMAC covers, so parse only after verifying it.
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  if (!razorpay.verifyWebhookSignature(raw, req.get("x-razorpay-signature"))) {
    console.warn("Rejected Razorpay webhook with an invalid signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = cod.text(req.get("x-razorpay-event"));
  let body;
  try {
    body = JSON.parse(raw.toString("utf8") || "{}");
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  // Razorpay nests the entity under payload, e.g. { event, payload: { payment: { entity } } }.
  const payload = body.payload && typeof body.payload === "object" ? body.payload : body;
  try {
    // payment.captured is the settlement signal. order.paid carries no payment
    // id unless payments are expanded, so it is acknowledged but not applied.
    if (event === "payment.captured") {
      const payment = payload.payment?.entity || {};
      const ref = await findOrderRef(payload);
      if (!ref) return res.json({ received: true, ignored: "unknown order" });
      const order = (await ref.get()).data();
      // Reconciles orders whose browser callback never arrived.
      if (order.paymentStatus !== "paid" && cod.text(payment.id)) {
        await service.markPaid(ref.id, {
          razorpayOrderId: order.razorpayOrderId,
          razorpayPaymentId: cod.text(payment.id),
          razorpaySignature: null,
          source: "webhook",
        });
      }
      return res.json({ received: true });
    }

    if (event === "payment.failed") {
      const payment = payload.payment?.entity || {};
      const ref = await findOrderRef(payload);
      // A failure must never overwrite a settled or already-released order.
      if (ref) {
        await service.releaseUnpaid(ref.id, { uid: "razorpay-webhook", role: "admin" }, { reason: `Payment failed (${payment.code || "unknown"}).` })
          .catch(err => console.warn(`Payment-failed release for ${ref.id}: ${err.message}`));
      }
      return res.json({ received: true });
    }

    if (event === "refund.processed") {
      const refund = payload.refund?.entity || {};
      const paymentId = cod.text(refund.payment_id);
      if (paymentId) {
        const found = await orders.where("razorpayPaymentId", "==", paymentId).limit(1).get();
        if (!found.empty) {
          const ref = found.docs[0].ref;
          const order = found.docs[0].data();
          const refundedAmount = cod.money((order.refundedAmount || 0) + razorpay.toRupees(refund.amount || 0));
          await ref.update({
            razorpayRefundId: refund.id || order.razorpayRefundId,
            refundedAmount,
            paymentStatus: refundedAmount >= order.total ? "refunded" : "partially_refunded",
            refundPending: false,
            updatedAt: new Date(),
          });
        }
      }
      return res.json({ received: true });
    }

    return res.json({ received: true, ignored: event || "unknown event" });
  } catch (err) {
    console.error("Razorpay webhook handler failed:", err.message);
    // 500 makes Razorpay retry, which is what we want for a transient failure.
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;
