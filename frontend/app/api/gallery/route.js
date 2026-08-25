import { NextResponse } from "next/server";
import { getAdminDb, serializeTimestamp } from "../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../lib/serverApi";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/gallery");
    }

    const snapshot = await db.collection("gallery").get();
    const items = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "",
          caption: data.caption || "",
          instagramLink: data.instagramLink || "",
          imageUrl: data.imageUrl || "",
          imageAlt: data.imageAlt || "",
          sortOrder: Number(data.sortOrder ?? 0),
          createdAt: serializeTimestamp(data.createdAt),
          updatedAt: serializeTimestamp(data.updatedAt),
        };
      })
      .sort((a, b) => {
        const aOrder = Number(a.sortOrder ?? 0);
        const bOrder = Number(b.sortOrder ?? 0);
        if (aOrder !== bOrder) return aOrder - bOrder;

        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch gallery items",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: 500 }
    );
  }
}
