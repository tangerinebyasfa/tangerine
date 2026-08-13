const { db, admin } = require("../config/firebaseAdmin");

const productsRef = db.collection("products");

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

// GET /api/products?category=dresses&limit=20
exports.getProducts = async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = productsRef;

    if (category) {
      query = query.where("categorySlug", "==", category);
    }
    if (featured === "true") {
      query = query.where("featured", "==", true);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();
    const products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const doc = await productsRef.doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

// POST /api/products (admin only)
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      compareAtPrice,
      categoryId,
      categorySlug,
      images,
      sizes,
      colors,
      stock,
      featured,
    } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: "name, price and categoryId are required" });
    }

    const newProduct = {
      name,
      description: description || "",
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      categoryId,
      categorySlug: categorySlug || null,
      images: normalizeList(images),
      sizes: normalizeList(sizes),
      colors: normalizeList(colors),
      stock: typeof stock === "number" ? stock : 0,
      featured: !!featured,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await productsRef.add(newProduct);
    res.status(201).json({ id: docRef.id, ...newProduct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
};

// PUT /api/products/:id (admin only)
exports.updateProduct = async (req, res) => {
  try {
    const docRef = productsRef.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });

    const updates = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    delete updates.id;
    delete updates.createdAt;

    if ("images" in updates) updates.images = normalizeList(updates.images);
    if ("sizes" in updates) updates.sizes = normalizeList(updates.sizes);
    if ("colors" in updates) updates.colors = normalizeList(updates.colors);

    await docRef.update(updates);
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
};

// DELETE /api/products/:id (admin only)
exports.deleteProduct = async (req, res) => {
  try {
    const docRef = productsRef.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Product not found" });

    await docRef.delete();
    res.json({ message: "Product deleted", id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
};
