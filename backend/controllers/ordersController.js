const { db, admin } = require("../config/firebaseAdmin");

const ordersRef = db.collection("orders");
const productsRef = db.collection("products");
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

function groupQuantitiesByProduct(items = []) {
  return items.reduce((acc, item) => {
    const productId = normalizeText(item.productId);
    const quantity = Math.max(1, Number(item.quantity || 1));
    if (!productId || quantity <= 0) return acc;
    acc.set(productId, (acc.get(productId) || 0) + quantity);
    return acc;
  }, new Map());
}

function pickProductPrice(product) {
  return normalizeMoney(product?.compareAtPrice ?? product?.price ?? 0);
}

function getProductImage(product) {
  return normalizeText(product?.image || product?.images?.[0] || "");
}

function enrichOrderItems(items = [], productMap = new Map()) {
  return items.map((item) => {
    const product = productMap.get(item.productId) || {};
    const unitPrice = pickProductPrice(product);
    const lineTotal = normalizeMoney(item.lineTotal ?? unitPrice * item.quantity);

    return {
      productId: item.productId,
      productSlug: normalizeText(product.slug || item.productSlug || item.slug),
      productName: normalizeText(product.name || item.productName || item.name) || "Product",
      productImage: getProductImage(product) || normalizeText(item.productImage || item.image),
      size: normalizeText(item.size),
      color: normalizeText(item.color),
      quantity: Math.max(1, Number(item.quantity || 1)),
      unitPrice,
      lineTotal,
    };
  });
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

function groupOrderQuantities(items = []) {
  return items.reduce((acc, item) => {
    const productId = normalizeText(item?.productId);
    const quantity = Math.max(1, Number(item?.quantity || 1));
    if (!productId || quantity <= 0) return acc;
    acc.set(productId, (acc.get(productId) || 0) + quantity);
    return acc;
  }, new Map());
}

async function adjustInventoryForStatusChange(tx, orderSnap, nextStatus) {
  const data = orderSnap.data() || {};
  const previousStatus = normalizeOrderStatus(data.status);

  if (previousStatus === nextStatus) return;

  const shouldRestoreStock = previousStatus !== "cancelled" && nextStatus === "cancelled";
  const shouldConsumeStock = previousStatus === "cancelled" && nextStatus !== "cancelled";
  if (!shouldRestoreStock && !shouldConsumeStock) return;

  const quantities = groupOrderQuantities(Array.isArray(data.items) ? data.items : []);
  if (!quantities.size) return;

  const productRefs = [...quantities.keys()].map((productId) => productsRef.doc(productId));
  const productSnapshots = await Promise.all(productRefs.map((ref) => tx.get(ref)));
  const productMap = new Map();

  productSnapshots.forEach((snap) => {
    if (snap.exists) {
      productMap.set(snap.id, snap.data());
    }
  });

  const delta = shouldRestoreStock ? 1 : -1;

  for (const [productId, quantity] of quantities.entries()) {
    const product = productMap.get(productId);
    if (!product || typeof product.stock !== "number") continue;

    tx.update(productsRef.doc(productId), {
      stock: Math.max(0, Number(product.stock || 0) + delta * quantity),
      updatedAt: new Date(),
    });
  }
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
  const groupedQuantities = groupQuantitiesByProduct(items);
  const productRefs = [...groupedQuantities.keys()].map((productId) => productsRef.doc(productId));
  const orderRef = ordersRef.doc(orderId);

  const run = async (tx) => {
    const productSnapshots = await Promise.all(productRefs.map((ref) => tx.get(ref)));
    const productMap = new Map();

    productSnapshots.forEach((snap) => {
      if (snap.exists) {
        productMap.set(snap.id, snap.data());
      }
    });

    for (const [productId, quantityNeeded] of groupedQuantities.entries()) {
      const product = productMap.get(productId);
      if (!product) {
        const error = new Error(`Product not found: ${productId}`);
        error.status = 404;
        throw error;
      }

      if (typeof product.stock === "number" && product.stock < quantityNeeded) {
        const error = new Error(`Only ${product.stock} left in stock for ${product.name || productId}.`);
        error.status = 409;
        throw error;
      }
    }

    const enrichedItems = enrichOrderItems(items, productMap);
    const itemCount = enrichedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const nowDate = new Date();

    productSnapshots.forEach((snap) => {
      const qty = groupedQuantities.get(snap.id) || 0;
      if (qty > 0 && typeof snap.data()?.stock === "number") {
        tx.update(snap.ref, {
          stock: Math.max(0, Number(snap.data().stock || 0) - qty),
          updatedAt: nowDate,
        });
      }
    });

    tx.set(orderRef, {
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
      items: enrichedItems,
      itemCount,
      subtotal: enrichedItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0),
      discount,
      discountCode: normalizeText(payload.discountCode || "") || null,
      shipping,
      total: Math.max(0, enrichedItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) + shipping - discount),
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
  };

  if (typeof db.runTransaction === "function") {
    await db.runTransaction(run);
  } else {
    await run({
      get: async (ref) => ref.get(),
      update: async (ref, updates) => ref.update(updates),
      set: async (ref, data) => ref.set(data),
    });
  }

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

    const entry = {
      status: nextStatus,
      at: new Date(),
      by: req.user.uid,
      note: normalizeText(req.body.note) || `Order marked ${nextStatus}`,
    };

    const applyUpdate = async (tx) => {
      const freshSnap = await tx.get(docRef);
      if (!freshSnap.exists) {
        const error = new Error("Order not found");
        error.status = 404;
        throw error;
      }

      const currentHistory = Array.isArray(freshSnap.data()?.statusHistory) ? freshSnap.data().statusHistory : [];
      await adjustInventoryForStatusChange(tx, freshSnap, nextStatus);

      tx.update(docRef, {
        status: nextStatus,
        updatedAt: new Date(),
        statusUpdatedAt: new Date(),
        statusUpdatedBy: req.user.uid,
        statusHistory: [...currentHistory, entry],
      });
    };

    if (typeof db.runTransaction === "function") {
      await db.runTransaction(applyUpdate);
    } else {
      await applyUpdate({
        get: async (ref) => ref.get(),
        update: async (ref, updates) => ref.update(updates),
      });
    }

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
