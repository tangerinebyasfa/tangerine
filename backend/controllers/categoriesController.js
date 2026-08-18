const { db, admin } = require("../config/firebaseAdmin");

const categoriesRef = db.collection("categories");
const subcategoriesRef = db.collection("subcategories");
const productsRef = db.collection("products");
const PRODUCT_TYPES = ["accessories", "clothes", "footwear"];

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeParentType = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return PRODUCT_TYPES.includes(normalized) ? normalized : null;
};

const getTimestamp = () =>
  admin?.firestore?.FieldValue?.serverTimestamp
    ? admin.firestore.FieldValue.serverTimestamp()
    : new Date().toISOString();

async function mirrorToSubcategories(id, data) {
  await subcategoriesRef.doc(id).set({ ...data, id }, { merge: true });
}

async function deleteFromSubcategories(id) {
  await subcategoriesRef.doc(id).delete();
}

async function backfillSubcategoriesFromCategories(categories) {
  const subcategoriesSnapshot = await subcategoriesRef.get();
  if (!subcategoriesSnapshot.empty || !categories.length) return;

  await Promise.all(
    categories.map((category) => subcategoriesRef.doc(category.id).set(category, { merge: true }))
  );
}

// GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const snapshot = await categoriesRef.orderBy("name").get();
    const categories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    await backfillSubcategoriesFromCategories(categories);
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

// GET /api/categories/:idOrSlug
exports.getCategory = async (req, res) => {
  try {
    const doc = await categoriesRef.doc(req.params.id).get();
    if (doc.exists) return res.json({ id: doc.id, ...doc.data() });

    // fall back to lookup by slug
    const snapshot = await categoriesRef.where("slug", "==", req.params.id).limit(1).get();
    if (!snapshot.empty) {
      const found = snapshot.docs[0];
      return res.json({ id: found.id, ...found.data() });
    }

    const subcategoryDoc = await subcategoriesRef.doc(req.params.id).get();
    if (subcategoryDoc.exists) return res.json({ id: subcategoryDoc.id, ...subcategoryDoc.data() });

    const subcategorySnapshot = await subcategoriesRef.where("slug", "==", req.params.id).limit(1).get();
    if (subcategorySnapshot.empty) return res.status(404).json({ error: "Category not found" });

    const found = subcategorySnapshot.docs[0];
    res.json({ id: found.id, ...found.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch category" });
  }
};

// POST /api/categories (admin only)
exports.createCategory = async (req, res) => {
  try {
    const { name, description, image, parentType } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const normalizedParentType = normalizeParentType(parentType);
    if (parentType && !normalizedParentType) {
      return res.status(400).json({ error: "parentType must be accessories, clothes or footwear" });
    }

    const newCategory = {
      name,
      slug: slugify(name),
      description: description || "",
      image: image || null,
      parentType: normalizedParentType,
      createdAt: getTimestamp(),
    };

    const docRef = await categoriesRef.add(newCategory);
    await mirrorToSubcategories(docRef.id, newCategory);
    res.status(201).json({ id: docRef.id, ...newCategory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
};

// PUT /api/categories/:id (admin only)
exports.updateCategory = async (req, res) => {
  try {
    const docRef = categoriesRef.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Category not found" });

    const previous = doc.data() || {};

    const updates = { ...req.body };
    if (updates.name) updates.slug = slugify(updates.name);
    if ("parentType" in updates) {
      const normalizedParentType = normalizeParentType(updates.parentType);
      if (updates.parentType && !normalizedParentType) {
        return res.status(400).json({ error: "parentType must be accessories, clothes or footwear" });
      }
      updates.parentType = normalizedParentType;
    }
    delete updates.id;
    delete updates.createdAt;

    await docRef.update(updates);
    const updated = await docRef.get();

    const categoryChanged =
      (updates.slug && updates.slug !== previous.slug) ||
      ("parentType" in updates && updates.parentType !== previous.parentType) ||
      (updates.name && updates.name !== previous.name);

    if (categoryChanged) {
      const productsSnapshot = await db.collection("products").get();
      const matchingProducts = productsSnapshot.docs.filter((productDoc) => {
        const product = productDoc.data() || {};
        return product.categoryId === req.params.id;
      });

      await Promise.all(
        matchingProducts.map((productDoc) =>
          productsRef.doc(productDoc.id).update({
            categorySlug: updated.data().slug || null,
            categoryParentType: updated.data().parentType || null,
            productType: updated.data().parentType || null,
            updatedAt: getTimestamp(),
          })
        )
      );
    }

    await mirrorToSubcategories(req.params.id, { id: updated.id, ...updated.data() });
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
};

// DELETE /api/categories/:id (admin only)
exports.deleteCategory = async (req, res) => {
  try {
    const docRef = categoriesRef.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Category not found" });

    await docRef.delete();
    await deleteFromSubcategories(req.params.id);
    res.json({ message: "Category deleted", id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
};
