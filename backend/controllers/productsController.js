const { db, admin } = require("../config/firebaseAdmin");

const productsRef = db.collection("products");

const getTimestamp = () =>
  admin?.firestore?.FieldValue?.serverTimestamp
    ? admin.firestore.FieldValue.serverTimestamp()
    : new Date().toISOString();

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// GET /api/products?category=dresses&limit=20
exports.getProducts = async (req, res) => {
  try {
    const { category, featured, type } = req.query;
    const snapshot = await productsRef.get();
    const products = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((product) => {
        if (category && product.categorySlug !== category) {
          return false;
        }
        if (type && (product.categoryParentType || product.productType) !== type) {
          return false;
        }
        if (featured === "true" && !product.featured) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime();
        const bTime = b.createdAt?.toMillis?.() ?? new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
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
      materials,
      washCare,
      deliveryInfo,
      price,
      compareAtPrice,
      productType,
      categoryId,
      categorySlug,
      categoryParentType,
      images,
      sizes,
      colors,
      stock,
      featured,
    } = req.body;

    if (!name || !price || !categoryId || !productType) {
      return res.status(400).json({ error: "name, price, productType and categoryId are required" });
    }

    const newProduct = {
      name,
      description: description || "",
      materials: normalizeText(materials),
      washCare: normalizeText(washCare),
      deliveryInfo: normalizeText(deliveryInfo),
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      productType,
      categoryId,
      categorySlug: categorySlug || null,
      categoryParentType: categoryParentType || productType,
      images: normalizeList(images),
      sizes: normalizeList(sizes),
      colors: normalizeList(colors),
      stock: typeof stock === "number" ? stock : 0,
      featured: !!featured,
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
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
      updatedAt: getTimestamp(),
    };
    delete updates.id;
    delete updates.createdAt;

    if ("images" in updates) updates.images = normalizeList(updates.images);
    if ("sizes" in updates) updates.sizes = normalizeList(updates.sizes);
    if ("colors" in updates) updates.colors = normalizeList(updates.colors);
    if ("materials" in updates) updates.materials = normalizeText(updates.materials);
    if ("washCare" in updates) updates.washCare = normalizeText(updates.washCare);
    if ("deliveryInfo" in updates) updates.deliveryInfo = normalizeText(updates.deliveryInfo);
    if ("categoryParentType" in updates && !updates.categoryParentType && updates.productType) {
      updates.categoryParentType = updates.productType;
    }

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
