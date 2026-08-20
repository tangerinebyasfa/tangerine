const { db, admin } = require("../config/firebaseAdmin");

const galleryRef = db.collection("gallery");

const getTimestamp = () =>
  admin?.firestore?.FieldValue?.serverTimestamp
    ? admin.firestore.FieldValue.serverTimestamp()
    : new Date().toISOString();

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

const DRIVE_FILE_ID_PATTERNS = [
  /drive\.google\.com\/file\/d\/([^/]+)/i,
  /drive\.google\.com\/open\?id=([^&/]+)/i,
  /drive\.google\.com\/uc\?(?:[^#]*&)?id=([^&/]+)/i,
  /drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([^&/]+)/i,
  /drive\.google\.com\/uc\?export=view&id=([^&/]+)/i,
  /drive\.google\.com\/uc\?export=download&id=([^&/]+)/i,
];

function getDriveFileId(value) {
  const url = normalizeText(value);
  if (!url) return null;

  for (const pattern of DRIVE_FILE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function normalizeImageUrl(value) {
  const url = normalizeText(value);
  if (!url) return "";

  if (url.startsWith("/")) return url;

  const driveFileId = getDriveFileId(url);
  if (driveFileId) {
    return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
  }

  return url;
}

// GET /api/gallery
exports.getGalleryItems = async (req, res) => {
  try {
    const snapshot = await galleryRef.get();
    const items = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const aOrder = Number(a.sortOrder ?? 0);
        const bOrder = Number(b.sortOrder ?? 0);
        if (aOrder !== bOrder) return aOrder - bOrder;

        const aTime = a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime();
        const bTime = b.createdAt?.toMillis?.() ?? new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch gallery items" });
  }
};

// POST /api/gallery (admin only)
exports.createGalleryItem = async (req, res) => {
  try {
    const { title, caption, instagramLink, imageUrl, imageAlt, sortOrder } = req.body;

    const normalizedImageUrl = normalizeImageUrl(imageUrl);
    if (!normalizeText(title) || !normalizedImageUrl) {
      return res.status(400).json({ error: "title and imageUrl are required" });
    }

    const newItem = {
      title: normalizeText(title),
      caption: normalizeText(caption),
      instagramLink: normalizeText(instagramLink),
      imageUrl: normalizedImageUrl,
      imageAlt: normalizeText(imageAlt),
      sortOrder: Number(sortOrder || 0),
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
    };

    const docRef = await galleryRef.add(newItem);
    res.status(201).json({ id: docRef.id, ...newItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create gallery item" });
  }
};

// PUT /api/gallery/:id (admin only)
exports.updateGalleryItem = async (req, res) => {
  try {
    const docRef = galleryRef.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Gallery item not found" });

    const updates = { ...req.body, updatedAt: getTimestamp() };
    if ("title" in updates) updates.title = normalizeText(updates.title);
    if ("caption" in updates) updates.caption = normalizeText(updates.caption);
    if ("instagramLink" in updates) updates.instagramLink = normalizeText(updates.instagramLink);
    if ("imageUrl" in updates) updates.imageUrl = normalizeImageUrl(updates.imageUrl);
    if ("imageAlt" in updates) updates.imageAlt = normalizeText(updates.imageAlt);
    if ("sortOrder" in updates) updates.sortOrder = Number(updates.sortOrder || 0);

    delete updates.id;
    delete updates.createdAt;

    if (!updates.title || !updates.imageUrl) {
      return res.status(400).json({ error: "title and imageUrl are required" });
    }

    await docRef.update(updates);
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update gallery item" });
  }
};

// DELETE /api/gallery/:id (admin only)
exports.deleteGalleryItem = async (req, res) => {
  try {
    const docRef = galleryRef.doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Gallery item not found" });

    await docRef.delete();
    res.json({ message: "Gallery item deleted", id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete gallery item" });
  }
};
