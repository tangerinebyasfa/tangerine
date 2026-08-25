import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/users/sync");
    }

    const user = await authenticateRequest(request);

    const body = await request.json().catch(() => ({}));
    const ref = db.collection("users").doc(user.uid);
    const snap = await ref.get();

    if (!snap.exists) {
      const created = {
        uid: user.uid,
        email: user.email,
        displayName: body.displayName || user.email.split("@")[0] || "",
        photoURL: body.photoURL || null,
        role: "customer",
        createdAt: new Date(),
      };

      await ref.set(created);
      return NextResponse.json({
        id: user.uid,
        ...created,
        createdAt: serializeTimestamp(created.createdAt),
      }, { status: 201 });
    }

    const data = snap.data();
    return NextResponse.json({
      id: snap.id,
      ...data,
      createdAt: serializeTimestamp(data.createdAt),
      updatedAt: serializeTimestamp(data.updatedAt),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to sync user",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
