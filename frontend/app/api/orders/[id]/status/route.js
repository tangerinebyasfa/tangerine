import { NextResponse } from "next/server";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../../lib/serverApi";
import { normalizeOrderStatus } from "../../../../../lib/order";

export const dynamic = "force-dynamic";

function formatOrder(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    statusHistory: Array.isArray(data.statusHistory)
      ? data.statusHistory.map((entry) => ({
          ...entry,
          at: serializeTimestamp(entry.at),
        }))
      : [],
  };
}

export async function PUT(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/orders/${params.id}/status`);
    }

    await requireAdminRequest(request);

    const body = await request.json().catch(() => ({}));
    const status = normalizeOrderStatus(body.status);

    const id = String(params.id || "").trim();
    const ref = db.collection("orders").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const now = new Date();
    const historyEntry = {
      status,
      at: now,
      by: "admin",
      note: body.note ? String(body.note).trim() : `Order marked ${status}`,
    };

    await ref.update({
      status,
      updatedAt: now,
      statusHistory: [...(snap.data()?.statusHistory || []), historyEntry],
      statusUpdatedAt: now,
      statusUpdatedBy: "admin",
    });
    const updated = await ref.get();
    return NextResponse.json(formatOrder(updated));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to update order",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
