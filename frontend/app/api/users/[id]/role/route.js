import { NextResponse } from "next/server";
import { requireAdminRequest, getAdminDb, serializeTimestamp } from "../../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../../lib/serverApi";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/users/${params.id}/role`);
    }

    await requireAdminRequest(request);

    const body = await request.json().catch(() => ({}));
    const role = body.role;

    if (!["admin", "customer"].includes(role)) {
      return NextResponse.json({ error: "role must be 'admin' or 'customer'" }, { status: 400 });
    }

    const ref = db.collection("users").doc(params.id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await ref.update({ role, updatedAt: new Date() });
    const updated = await ref.get();
    const data = updated.data();

    return NextResponse.json({
      id: updated.id,
      ...data,
      createdAt: serializeTimestamp(data.createdAt),
      updatedAt: serializeTimestamp(data.updatedAt),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error.message || "Failed to update role",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
