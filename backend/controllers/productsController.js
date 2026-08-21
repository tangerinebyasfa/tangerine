const { db, admin } = require("../config/firebaseAdmin");

const productsRef = db.collection("products");

const getTimestamp = () =>
  admin?.firestore?.FieldValue?.serverTimestamp
    ? admin.firestore.FieldValue.serverTimestamp()
    : new Date().toISOString();

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeAvailableAt(value) {
  return normalizeList(value);
}

function mapProduct(doc) {
  return { id: doc.id, ...doc.data() };
}

async function findByCode(code) {
  if (!code) return null;
  const snapshot = await productsRef.where("code", "==", code).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0];
}

async function findBySlugOrId(slugOrId) {
  const byId = await productsRef.doc(slugOrId).get();
  if (byId.exists) return byId;

  const bySlug = await productsRef.where("slug", "==", slugOrId).limit(1).get();
  if (!bySlug.empty) return bySlug.docs[0];

  const byCode = await productsRef.where("code", "==", slugOrId).limit(1).get();
  if (!byCode.empty) return byCode.docs[0];

  return null;
}

exports.getProducts = async (req, res) => {
  try {
    const snapshot = await productsRef.orderBy("createdAt", "desc").get();
    res.json(snapshot.docs.map(mapProduct));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const doc = await findBySlugOrId(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const body = req.body || {};
    const name = normalizeText(body.name);
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const code = normalizeText(body.code) || slugify(name);
    const existing = await findByCode(code);
    if (existing) {
      return res.status(409).json({ error: "Product code already exists" });
    }

    const product = {
      name,
      code,
      slug: slugify(body.slug || name || code),
      description: normalizeText(body.description),
      additionalInfo: normalizeList(body.additionalInfo),
      sizeOptions: normalizeList(body.sizeOptions),
      materials: normalizeList(body.materials),
      washCare: normalizeList(body.washCare),
      deliveryInfo: normalizeText(body.deliveryInfo),
      price: normalizeNumber(body.price),
      compareAtPrice: normalizeNumber(body.compareAtPrice),
      productType: normalizeText(body.productType),
      subType: normalizeText(body.subType),
      stock: normalizeNumber(body.stock),
      images: normalizeList(body.images),
      sizes: normalizeList(body.sizes),
      colors: normalizeList(body.colors),
      availableAt: normalizeAvailableAt(body.availableAt),
      featured: normalizeBoolean(body.featured),
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
    };

    const docRef = await productsRef.add(product);
    res.status(201).json({ id: docRef.id, ...product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const docRef = productsRef.doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Product not found" });
    }

    const updates = { ...(req.body || {}), updatedAt: getTimestamp() };

    if ("name" in updates) {
      updates.name = normalizeText(updates.name);
      updates.slug = slugify(updates.slug || updates.name);
    }
    if ("code" in updates) {
      updates.code = normalizeText(updates.code) || updates.slug || slugify(updates.name || "");
    }
    if ("description" in updates) updates.description = normalizeText(updates.description);
    if ("additionalInfo" in updates) updates.additionalInfo = normalizeList(updates.additionalInfo);
    if ("sizeOptions" in updates) updates.sizeOptions = normalizeList(updates.sizeOptions);
    if ("materials" in updates) updates.materials = normalizeList(updates.materials);
    if ("washCare" in updates) updates.washCare = normalizeList(updates.washCare);
    if ("deliveryInfo" in updates) updates.deliveryInfo = normalizeText(updates.deliveryInfo);
    if ("price" in updates) updates.price = normalizeNumber(updates.price);
    if ("compareAtPrice" in updates) updates.compareAtPrice = normalizeNumber(updates.compareAtPrice);
    if ("productType" in updates) updates.productType = normalizeText(updates.productType);
    if ("subType" in updates) updates.subType = normalizeText(updates.subType);
    if ("stock" in updates) updates.stock = normalizeNumber(updates.stock);
    if ("images" in updates) updates.images = normalizeList(updates.images);
    if ("sizes" in updates) updates.sizes = normalizeList(updates.sizes);
    if ("colors" in updates) updates.colors = normalizeList(updates.colors);
    if ("availableAt" in updates) updates.availableAt = normalizeAvailableAt(updates.availableAt);
    if ("featured" in updates) updates.featured = normalizeBoolean(updates.featured);

    delete updates.id;
    delete updates.createdAt;

    await docRef.update(updates);
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const docRef = productsRef.doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Product not found" });
    }

    await docRef.delete();
    res.json({ message: "Product deleted", id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
};
