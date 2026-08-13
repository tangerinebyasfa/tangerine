const { db, admin } = require("../config/firebaseAdmin");

const categoriesRef = db.collection("categories");

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const snapshot = await categoriesRef.orderBy("name").get();
    const categories = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
    if (snapshot.empty) return res.status(404).json({ error: "Category not found" });

    const found = snapshot.docs[0];
    res.json({ id: found.id, ...found.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch category" });
  }
};

// POST /api/categories (admin only)
exports.createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const newCategory = {
      name,
      slug: slugify(name),
      description: description || "",
      image: image || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await categoriesRef.add(newCategory);
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

    const updates = { ...req.body };
    if (updates.name) updates.slug = slugify(updates.name);
    delete updates.id;
    delete updates.createdAt;

    await docRef.update(updates);
    const updated = await docRef.get();
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
    res.json({ message: "Category deleted", id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
};
