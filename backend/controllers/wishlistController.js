const { db, admin } = require("../config/firebaseAdmin");

const usersRef = db.collection("users");
const getTimestamp = () =>
  admin?.firestore?.FieldValue?.serverTimestamp
    ? admin.firestore.FieldValue.serverTimestamp()
    : new Date().toISOString();

function wishlistRef(uid) {
  return usersRef.doc(uid).collection("wishlist");
}

exports.getWishlist = async (req, res) => {
  try {
    const snapshot = await wishlistRef(req.user.uid).orderBy("addedAt", "desc").get();
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
};

exports.addWishlistItem = async (req, res) => {
  try {
    const productId = String(req.params.productId || "").trim();

    if (!productId) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const ref = wishlistRef(req.user.uid).doc(productId);
    await ref.set(
      {
        productId,
        addedAt: getTimestamp(),
      },
      { merge: true }
    );

    const doc = await ref.get();
    return res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add wishlist item" });
  }
};

exports.removeWishlistItem = async (req, res) => {
  try {
    const productId = String(req.params.productId || "").trim();

    if (!productId) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    await wishlistRef(req.user.uid).doc(productId).delete();
    res.json({ ok: true, productId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove wishlist item" });
  }
};
