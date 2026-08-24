const { db, admin } = require("../config/firebaseAdmin");

const blogsRef = db.collection("blogs");

const getTimestamp = () =>
  admin?.firestore?.FieldValue?.serverTimestamp
    ? admin.firestore.FieldValue.serverTimestamp()
    : new Date().toISOString();

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

function createExcerpt(content, maxLength = 220) {
  const text = normalizeText(content).replace(/\s+/g, " ");
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function sortBlogs(items) {
  return [...items].sort((a, b) => {
    const aTime = a.publishedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? new Date(a.publishedAt || a.createdAt || 0).getTime();
    const bTime = b.publishedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? new Date(b.publishedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function mapBlog(doc) {
  return { id: doc.id, ...doc.data() };
}

async function findBlogBySlugOrId(slugOrId) {
  const byId = await blogsRef.doc(slugOrId).get();
  if (byId.exists) return byId;

  const bySlug = await blogsRef.where("slug", "==", slugOrId).limit(1).get();
  if (!bySlug.empty) return bySlug.docs[0];

  const allBlogs = await blogsRef.get();
  const found = allBlogs.docs.find((doc) => slugify(doc.data()?.title) === slugOrId);
  return found || null;
}

exports.getBlogs = async (req, res) => {
  try {
    const snapshot = await blogsRef.get();
    const blogs = snapshot.docs.map(mapBlog);
    res.json(sortBlogs(blogs));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const doc = await findBlogBySlugOrId(req.params.idOrSlug);
    if (!doc) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
};

exports.createBlog = async (req, res) => {
  try {
    const body = req.body || {};
    const title = normalizeText(body.title);
    const content = normalizeText(body.content);
    const imageUrl = normalizeImageUrl(body.imageUrl);
    const slug = slugify(body.slug || title);

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }
    if (!content) {
      return res.status(400).json({ error: "content is required" });
    }
    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    const newBlog = {
      title,
      slug,
      content,
      excerpt: normalizeText(body.excerpt) || createExcerpt(content),
      imageUrl,
      imageAlt: normalizeText(body.imageAlt) || title,
      createdAt: getTimestamp(),
      publishedAt: getTimestamp(),
      updatedAt: getTimestamp(),
    };

    const docRef = await blogsRef.add(newBlog);
    res.status(201).json({ id: docRef.id, ...newBlog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create blog post" });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const docRef = blogsRef.doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    const updates = { ...(req.body || {}), updatedAt: getTimestamp() };

    if ("title" in updates) updates.title = normalizeText(updates.title);
    if ("content" in updates) updates.content = normalizeText(updates.content);
    if ("imageUrl" in updates) updates.imageUrl = normalizeImageUrl(updates.imageUrl);
    if ("imageAlt" in updates) updates.imageAlt = normalizeText(updates.imageAlt);
    if ("slug" in updates || "title" in updates) {
      updates.slug = slugify(updates.slug || updates.title || existing.data().title);
    }
    if ("excerpt" in updates) updates.excerpt = normalizeText(updates.excerpt) || createExcerpt(updates.content || existing.data().content || "");

    delete updates.id;
    delete updates.createdAt;

    if (!updates.title || !updates.content || !updates.imageUrl) {
      return res.status(400).json({ error: "title, content, and imageUrl are required" });
    }

    await docRef.update(updates);
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update blog post" });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const docRef = blogsRef.doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    await docRef.delete();
    res.json({ message: "Blog post deleted", id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete blog post" });
  }
};
