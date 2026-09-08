const { db } = require("../config/firebaseAdmin");
const { validateCouponForOrder } = require("./couponsController");
const { createOrderService } = require("../services/orderService");
const ordersRef = db.collection("orders");
const service = createOrderService({ db, validateCouponForOrder });

function failure(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error("Order operation failed:", err.message);
  return res.status(status).json({ error: status >= 500 ? "Order service unavailable. Retry with the same checkout request." : err.message });
}
function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value.toMillis === "function") return new Date(value.toMillis()).toISOString();
  return value;
}

function serializeOrder(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    statusHistory: Array.isArray(data.statusHistory)
      ? data.statusHistory.map((entry) => ({
          ...entry,
          at: serializeTimestamp(entry.at),
        }))
      : [],
    displayOrderId: data.orderId || doc.id,
  };
}


exports.quoteOrder = async (req, res) => {
  try { res.json(await service.quote(req.body || {}, req.user)); }
  catch (err) { failure(res, err); }
};
exports.recoverOrder = async (req, res) => {
  try {
    const order = await service.recover(req.params.requestId, req.user);
    res.json(order ? serializeOrder(order) : null);
  } catch (err) { failure(res, err); }
};
exports.createOrder = async (req, res) => {
  try { res.status(201).json(serializeOrder(await service.create(req.body || {}, req.user))); }
  catch (err) { failure(res, err); }
};
exports.updateOrderStatus = async (req, res) => {
  try { res.json(serializeOrder(await service.update(req.params.id, req.body || {}, req.user))); }
  catch (err) { failure(res, err); }
};
exports.cancelOrder = async (req, res) => {
  try { res.json(serializeOrder(await service.update(req.params.id, {}, req.user, true))); }
  catch (err) { failure(res, err); }
};
exports.deleteOrder = async (req, res) => res.status(405).json({ error: "Orders are retained for inventory and payment records. Cancel an eligible order instead." });

// GET /api/orders/mine (logged-in user's own orders)
exports.getMyOrders = async (req, res) => {
  try {
    const snapshot = await ordersRef.where("userId", "==", req.user.uid).orderBy("createdAt", "desc").get();
    const orders = snapshot.docs.map(serializeOrder);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// GET /api/orders/:id (owner or admin)
exports.getOrderById = async (req, res) => {
  try {
    const doc = await ordersRef.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Order not found" });

    const data = doc.data();
    if (req.user.role !== "admin" && data.userId !== req.user.uid) {
      return res.status(403).json({ error: "Not authorized" });
    }

    res.json(serializeOrder(doc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
};

// GET /api/orders (admin only - all orders)
exports.getAllOrders = async (req, res) => {
  try {
    const snapshot = await ordersRef.orderBy("createdAt", "desc").get();
    const orders = snapshot.docs.map(serializeOrder);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};
