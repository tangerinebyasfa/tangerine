import { NextResponse } from "next/server";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

export const dynamic = "force-dynamic";

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatBlog(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || "",
    slug: data.slug || "",
    content: data.content || "",
    excerpt: data.excerpt || "",
    imageUrl: data.imageUrl || "",
    imageAlt: data.imageAlt || "",
    createdAt: serializeTimestamp(data.createdAt),
    publishedAt: serializeTimestamp(data.publishedAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function GET(_request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(_request, `/blogs/${params.slug}`);
    }

    const slug = String(params.slug || "").trim();
    if (!slug) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const directSnap = await db.collection("blogs").doc(slug).get();
    if (directSnap.exists) {
      const data = directSnap.data();
      return NextResponse.json({
        id: directSnap.id,
        title: data.title || "",
        slug: data.slug || "",
        content: data.content || "",
        excerpt: data.excerpt || "",
        imageUrl: data.imageUrl || "",
        imageAlt: data.imageAlt || "",
        createdAt: serializeTimestamp(data.createdAt),
        publishedAt: serializeTimestamp(data.publishedAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      });
    }

    const slugSnapshot = await db.collection("blogs").where("slug", "==", slug).get();
    if (!slugSnapshot.empty) {
      const doc = slugSnapshot.docs[0];
      const data = doc.data();
      return NextResponse.json({
        id: doc.id,
        title: data.title || "",
        slug: data.slug || "",
        content: data.content || "",
        excerpt: data.excerpt || "",
        imageUrl: data.imageUrl || "",
        imageAlt: data.imageAlt || "",
        createdAt: serializeTimestamp(data.createdAt),
        publishedAt: serializeTimestamp(data.publishedAt),
        updatedAt: serializeTimestamp(data.updatedAt),
      });
    }

    const allBlogs = await db.collection("blogs").get();
    const found = allBlogs.docs.find((document) => {
      const data = document.data();
      const fallback = String(data.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return fallback === slug;
    });

    if (!found) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const data = found.data();
    return NextResponse.json({
      id: found.id,
      title: data.title || "",
      slug: data.slug || "",
      content: data.content || "",
      excerpt: data.excerpt || "",
      imageUrl: data.imageUrl || "",
      imageAlt: data.imageAlt || "",
      createdAt: serializeTimestamp(data.createdAt),
      publishedAt: serializeTimestamp(data.publishedAt),
      updatedAt: serializeTimestamp(data.updatedAt),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch blog post",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/blogs/${params.slug}`);
    }

    await requireAdminRequest(request);

    const id = String(params.slug || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const ref = db.collection("blogs").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const current = snap.data() || {};
    const title = normalizeText(body.title) || normalizeText(current.title);
    const content = normalizeText(body.content) || normalizeText(current.content);
    const slug = normalizeText(body.slug) || normalizeText(current.slug) || slugify(title);
    const imageUrl = normalizeText(body.imageUrl) || normalizeText(current.imageUrl);
    const imageAlt = normalizeText(body.imageAlt) || normalizeText(current.imageAlt) || title;
    const excerpt = normalizeText(body.excerpt) || normalizeText(current.excerpt) || content.slice(0, 220);

    if (!title || !content || !imageUrl) {
      return NextResponse.json(
        { error: "title, content, and imageUrl are required" },
        { status: 400 }
      );
    }

    const updates = {
      title,
      slug,
      content,
      excerpt,
      imageUrl,
      imageAlt,
      updatedAt: new Date(),
    };

    await ref.update(updates);
    const updated = await ref.get();
    return NextResponse.json(formatBlog(updated));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to update blog post",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/blogs/${params.slug}`);
    }

    await requireAdminRequest(request);

    const id = String(params.slug || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    const ref = db.collection("blogs").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ message: "Blog post deleted", id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to delete blog post",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
