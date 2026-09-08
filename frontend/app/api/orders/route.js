import { NextResponse } from "next/server";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../lib/firebaseAdmin";
import { proxyOrderRequest } from "../../../lib/orderProxy";
import { proxyToBackend } from "../../../lib/serverApi";
export const dynamic = "force-dynamic";
export async function POST(request) { return proxyOrderRequest(request, "/orders"); }
function serializeHistory(history = []) {
  return history.map((entry) => ({
    ...entry,
    at: serializeTimestamp(entry.at),
  }));
}

function serializeOrderDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    statusHistory: Array.isArray(data.statusHistory) ? serializeHistory(data.statusHistory) : [],
    displayOrderId: data.orderId || doc.id,
  };
}

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/orders");
    }

    await requireAdminRequest(request);

    const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
    return NextResponse.json(snapshot.docs.map(serializeOrderDoc));
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
