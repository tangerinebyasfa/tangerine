import { NextResponse } from "next/server";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../lib/serverApi";

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

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/blogs");
    }

    const snapshot = await db.collection("blogs").get();
    const blogs = snapshot.docs
      .map(formatBlog)
      .sort((a, b) => {
        const aTime =
          new Date(a.publishedAt || a.createdAt || 0).getTime();
        const bTime =
          new Date(b.publishedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });

    return NextResponse.json(blogs);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch blog posts",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/blogs");
    }

    await requireAdminRequest(request);

    const body = await request.json().catch(() => ({}));
    const title = normalizeText(body.title);
    const content = normalizeText(body.content);
    const slug = normalizeText(body.slug) || slugify(title);
    const imageUrl = normalizeText(body.imageUrl);
    const imageAlt = normalizeText(body.imageAlt);
    const excerpt = normalizeText(body.excerpt) || content.slice(0, 220);

    if (!title || !content || !imageUrl) {
      return NextResponse.json(
        { error: "title, content, and imageUrl are required" },
        { status: 400 }
      );
    }

    const payload = {
      title,
      slug,
      content,
      excerpt,
      imageUrl,
      imageAlt: imageAlt || title,
      createdAt: new Date(),
      publishedAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await db.collection("blogs").add(payload);
    return NextResponse.json({ id: ref.id, ...payload }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to create blog post",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
