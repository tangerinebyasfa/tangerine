const { db, admin } = require("../config/firebaseAdmin");

const ordersRef = db.collection("orders");

// POST /api/orders (authenticated user creates an order from their cart)
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, subtotal, shipping, total } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: "Order must contain at least one item" });
    }

    const newOrder = {
      userId: req.user.uid,
      userEmail: req.user.email,
      items,
      shippingAddress: shippingAddress || {},
      paymentMethod: paymentMethod || "cod",
      subtotal: Number(subtotal) || 0,
      shipping: Number(shipping) || 0,
      total: Number(total) || 0,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await ordersRef.add(newOrder);
    res.status(201).json({ id: docRef.id, ...newOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
};

// GET /api/orders/mine (logged-in user's own orders)
exports.getMyOrders = async (req, res) => {
  try {
    const snapshot = await ordersRef
      .where("userId", "==", req.user.uid)
      .orderBy("createdAt", "desc")
      .get();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// GET /api/orders (admin only - all orders)
exports.getAllOrders = async (req, res) => {
  try {
    const snapshot = await ordersRef.orderBy("createdAt", "desc").get();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};

// PUT /api/orders/:id/status (admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${allowed.join(", ")}` });
    }

    const docRef = ordersRef.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Order not found" });

    await docRef.update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update order" });
  }
};
