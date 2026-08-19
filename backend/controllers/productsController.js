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

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function matchesSlug(product, requestedSlug) {
  return product.slug === requestedSlug || slugify(product.name) === requestedSlug;
}

function normalizeAdditionalInfo(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const label = normalizeText(item.label);
      const detailValue = normalizeText(item.value);
      if (!label && !detailValue) return null;
      return { label, value: detailValue };
    })
    .filter(Boolean);
}

function normalizeSizeOptions(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        const label = normalizeText(item);
        if (!label) return null;
        return { label, available: true };
      }

      if (!item || typeof item !== "object") return null;
      const label = normalizeText(item.label);
      if (!label) return null;
      return { label, available: !!item.available };
    })
    .filter(Boolean);
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
    if (doc.exists) return res.json({ id: doc.id, ...doc.data() });

    const snapshot = await productsRef.get();
    const found = snapshot.docs.find((productDoc) => matchesSlug(productDoc.data() || {}, req.params.id));
    if (found) return res.json({ id: found.id, ...found.data() });

    res.status(404).json({ error: "Product not found" });
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
      sizeGuide,
      additionalInfo,
      sizeOptions,
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
      slug: slugify(name),
      description: description || "",
      sizeGuide: normalizeText(sizeGuide),
      additionalInfo: normalizeAdditionalInfo(additionalInfo),
      sizeOptions: normalizeSizeOptions(sizeOptions),
      sizes: normalizeSizeOptions(sizeOptions)
        .filter((item) => item.available)
        .map((item) => item.label),
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
    delete updates.sizes;

    if ("images" in updates) updates.images = normalizeList(updates.images);
    if ("sizeOptions" in updates) {
      updates.sizeOptions = normalizeSizeOptions(updates.sizeOptions);
      updates.sizes = updates.sizeOptions.filter((item) => item.available).map((item) => item.label);
    }
    if ("colors" in updates) updates.colors = normalizeList(updates.colors);
    if ("sizeGuide" in updates) updates.sizeGuide = normalizeText(updates.sizeGuide);
    if ("additionalInfo" in updates) updates.additionalInfo = normalizeAdditionalInfo(updates.additionalInfo);
    if ("materials" in updates) updates.materials = normalizeText(updates.materials);
    if ("washCare" in updates) updates.washCare = normalizeText(updates.washCare);
    if ("deliveryInfo" in updates) updates.deliveryInfo = normalizeText(updates.deliveryInfo);
    if ("name" in updates) updates.slug = slugify(updates.name);
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
