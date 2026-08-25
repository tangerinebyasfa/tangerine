import { NextResponse } from "next/server";
import { getAdminDb, serializeTimestamp } from "../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../lib/serverApi";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/blogs");
    }

    const snapshot = await db.collection("blogs").get();
    const blogs = snapshot.docs
      .map((doc) => {
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
      })
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
