import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

export const dynamic = "force-dynamic";

function formatReview(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/reviews/mine");
    }

    const user = await authenticateRequest(request);
    const snapshot = await db
      .collection("reviews")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    return NextResponse.json(snapshot.docs.map(formatReview));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch reviews",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
