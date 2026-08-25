import { NextResponse } from "next/server";
import { getAdminDb, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

export const dynamic = "force-dynamic";

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
