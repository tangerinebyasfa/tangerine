import { NextResponse } from "next/server";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../../lib/serverApi";

export const dynamic = "force-dynamic";

function formatOrder(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function PUT(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/orders/${params.id}/status`);
    }

    await requireAdminRequest(request);

    const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
    const body = await request.json().catch(() => ({}));
    const status = String(body.status || "").trim();

    if (!allowed.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${allowed.join(", ")}` }, { status: 400 });
    }

    const id = String(params.id || "").trim();
    const ref = db.collection("orders").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await ref.update({ status, updatedAt: new Date() });
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
