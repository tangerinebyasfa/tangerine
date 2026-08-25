import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/users/me");
    }

    const user = await authenticateRequest(request);

    const ref = db.collection("users").doc(user.uid);
    const snap = await ref.get();

    if (!snap.exists) {
      const created = {
        uid: user.uid,
        email: user.email,
        displayName: user.email.split("@")[0] || "user",
        photoURL: null,
        role: user.role || "customer",
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
        error: "Failed to fetch profile",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/users/me");
    }

    const user = await authenticateRequest(request);

    const body = await request.json().catch(() => ({}));
    const updates = {
      ...(body.displayName && { displayName: body.displayName }),
      ...(body.phone && { phone: body.phone }),
      ...(body.address && { address: body.address }),
      updatedAt: new Date(),
    };

    await db.collection("users").doc(user.uid).set(updates, { merge: true });
    const updated = await db.collection("users").doc(user.uid).get();
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
        error: "Failed to update profile",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
