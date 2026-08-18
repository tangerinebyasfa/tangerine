const { db, admin } = require("../config/firebaseAdmin");

const usersRef = db.collection("users");

const getTimestamp = () =>
  admin?.firestore?.FieldValue?.serverTimestamp
    ? admin.firestore.FieldValue.serverTimestamp()
    : new Date().toISOString();

// POST /api/users/sync
// Called right after signup/signin on the client so a matching Firestore
// user document always exists (role defaults to "customer").
exports.syncUser = async (req, res) => {
  try {
    const { uid, email, role } = req.user;
    const docRef = usersRef.doc(uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      const newUser = {
        uid,
        email,
        displayName: req.body.displayName || email.split("@")[0],
        photoURL: req.body.photoURL || null,
        role: "customer",
        createdAt: getTimestamp(),
      };
      await docRef.set(newUser);
      return res.status(201).json(newUser);
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sync user" });
  }
};

// GET /api/users/me
exports.getMe = async (req, res) => {
  try {
    const docRef = usersRef.doc(req.user.uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      const newUser = {
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.user.email?.split("@")[0] || "user",
        photoURL: null,
        role: req.user.role || "customer",
        createdAt: getTimestamp(),
      };
      await docRef.set(newUser, { merge: true });
      return res.status(201).json({ id: req.user.uid, ...newUser });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// PUT /api/users/me
exports.updateMe = async (req, res) => {
  try {
    const { displayName, phone, address } = req.body;
    const docRef = usersRef.doc(req.user.uid);
    await docRef.set({
      ...(displayName && { displayName }),
      ...(phone && { phone }),
      ...(address && { address }),
      updatedAt: getTimestamp(),
    }, { merge: true });
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// GET /api/users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const snapshot = await usersRef.orderBy("createdAt", "desc").get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// PUT /api/users/:id/role (admin only) - promote/demote a user
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "customer"].includes(role)) {
      return res.status(400).json({ error: "role must be 'admin' or 'customer'" });
    }
    const docRef = usersRef.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });

    await docRef.update({ role });
    res.json({ id: req.params.id, role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update role" });
  }
};
