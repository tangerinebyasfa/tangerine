import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

export const dynamic = "force-dynamic";

function formatOrder(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    displayOrderId: data.orderId || doc.id,
    statusHistory: Array.isArray(data.statusHistory)
      ? data.statusHistory.map((entry) => ({
          ...entry,
          at: serializeTimestamp(entry.at),
        }))
      : [],
  };
}

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/orders/mine");
    }

    const user = await authenticateRequest(request);
    const snapshot = await db
      .collection("orders")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .get();

    return NextResponse.json(snapshot.docs.map(formatOrder));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch orders",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
