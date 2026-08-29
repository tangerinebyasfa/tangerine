import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

export const dynamic = "force-dynamic";

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

export async function GET(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/orders/${params.id}`);
    }

    const user = await authenticateRequest(request);
    const id = String(params.id || "").trim();
    const snap = await db.collection("orders").doc(id).get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const data = snap.data();
    const isOwner = data.userId === user.uid;
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    return NextResponse.json(serializeOrderDoc(snap));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch order",
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
      return proxyToBackend(request, `/orders/${params.id}`);
    }

    await requireAdminRequest(request);

    const id = String(params.id || "").trim();
    const ref = db.collection("orders").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await ref.delete();
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to delete order",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
