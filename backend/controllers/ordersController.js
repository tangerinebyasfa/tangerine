const { db, admin } = require("../config/firebaseAdmin");

const ordersRef = db.collection("orders");
const ORDER_PREFIX = "TGNR";
const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeMoney(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeOrderStatus(status) {
  const value = normalizeText(status).toLowerCase();
  return ORDER_STATUSES.includes(value) ? value : "pending";
}

function normalizePaymentStatus(status) {
  const value = normalizeText(status).toLowerCase();
  return PAYMENT_STATUSES.includes(value) ? value : "pending";
}

function generateReadableOrderId(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");

  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${ORDER_PREFIX}-${stamp}-${random}`;
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

function normalizeItems(items = []) {
  return items
    .map((item) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const unitPrice = normalizeMoney(item.unitPrice ?? item.price ?? 0);

      return {
        productId: normalizeText(item.productId),
        productSlug: normalizeText(item.productSlug || item.slug),
        productName: normalizeText(item.productName || item.name) || "Product",
        productImage: normalizeText(item.productImage || item.image),
        size: normalizeText(item.size),
        color: normalizeText(item.color),
        quantity,
        unitPrice,
        lineTotal: normalizeMoney(item.lineTotal ?? unitPrice * quantity),
      };
    })
    .filter((item) => item.productId && item.quantity > 0);
}

function buildShippingSummary(address = {}) {
  return [
    address.fullName,
    address.line1,
    address.line2,
    [address.city, address.state, address.zip].filter(Boolean).join(", "),
    address.country,
    address.phone,
  ]
    .filter(Boolean)
    .join(", ");
}

async function createOrderDocument(payload, user) {
  const items = normalizeItems(payload.items);
  if (!items.length) {
    const error = new Error("Order must contain at least one item");
    error.status = 400;
    throw error;
  }

  const orderId = generateReadableOrderId();
  const now = admin.firestore.Timestamp.now();
  const shippingAddress = {
    label: normalizeText(payload.shippingAddress?.label || "Shipping"),
    fullName: normalizeText(payload.shippingAddress?.fullName || payload.customerName || user.email?.split("@")[0] || ""),
    line1: normalizeText(payload.shippingAddress?.line1),
    line2: normalizeText(payload.shippingAddress?.line2),
    city: normalizeText(payload.shippingAddress?.city),
    state: normalizeText(payload.shippingAddress?.state),
    zip: normalizeText(payload.shippingAddress?.zip),
    country: normalizeText(payload.shippingAddress?.country || "India"),
    phone: normalizeText(payload.shippingAddress?.phone || payload.customerPhone || ""),
  };

  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  const shipping = normalizeMoney(payload.shipping, 0);
  const discount = normalizeMoney(payload.discount, 0);
  const total = Math.max(0, subtotal + shipping - discount);
  const paymentMethod = normalizeText(payload.paymentMethod || "cod").toLowerCase();
  const orderStatus = normalizeOrderStatus(payload.status || "pending");

  await ordersRef.doc(orderId).set({
    orderId,
    orderNumber: orderId,
    userId: user.uid,
    userUid: user.uid,
    userEmail: normalizeText(payload.customerEmail || user.email || ""),
    userPhone: normalizeText(payload.customerPhone || shippingAddress.phone || ""),
    customerName: normalizeText(payload.customerName || shippingAddress.fullName || user.email?.split("@")[0] || ""),
    customerEmail: normalizeText(payload.customerEmail || user.email || ""),
    customerPhone: normalizeText(payload.customerPhone || shippingAddress.phone || ""),
    shippingAddress,
    shippingAddressSummary: buildShippingSummary(shippingAddress),
    items,
    itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    subtotal,
    discount,
    discountCode: normalizeText(payload.discountCode || "") || null,
    shipping,
    total,
    currency: normalizeText(payload.currency) || "INR",
    paymentMethod,
    paymentStatus: normalizePaymentStatus(payload.paymentStatus || "pending"),
    paymentReference: normalizeText(payload.paymentReference || "") || null,
    paymentProvider: normalizeText(payload.paymentProvider || "") || null,
    status: orderStatus,
    statusHistory: [
      {
        status: orderStatus,
        at: new Date(),
        note: "Order placed",
        by: user.uid,
      },
    ],
    notes: normalizeText(payload.notes || "") || null,
    source: "checkout",
    createdAt: now,
    updatedAt: now,
  });

  const created = await ordersRef.doc(orderId).get();
  return serializeOrder(created);
}

// POST /api/orders (authenticated user creates an order from their cart)
exports.createOrder = async (req, res) => {
  try {
    const created = await createOrderDocument(req.body || {}, req.user);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Failed to create order" });
  }
};

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

// PUT /api/orders/:id/status (admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const nextStatus = normalizeOrderStatus(req.body.status);
    const docRef = ordersRef.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Order not found" });

    const history = Array.isArray(doc.data().statusHistory) ? doc.data().statusHistory : [];
    const entry = {
      status: nextStatus,
      at: new Date(),
      by: req.user.uid,
      note: normalizeText(req.body.note) || `Order marked ${nextStatus}`,
    };

    await docRef.update({
      status: nextStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      statusUpdatedBy: req.user.uid,
      statusHistory: [...history, entry],
    });

    const updated = await docRef.get();
    res.json(serializeOrder(updated));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
};

// DELETE /api/orders/:id (admin only)
exports.deleteOrder = async (req, res) => {
  try {
    const docRef = ordersRef.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Order not found" });

    await docRef.delete();
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete order" });
  }
};
