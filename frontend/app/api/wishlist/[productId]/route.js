import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, serializeTimestamp } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/wishlist/${params.productId}`);
    }

    const user = await authenticateRequest(request);

    const productId = String(params.productId || "").trim();
    if (!productId) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const ref = db.collection("users").doc(user.uid).collection("wishlist").doc(productId);
    await ref.set(
      {
        productId,
        addedAt: new Date(),
      },
      { merge: true }
    );

    const snap = await ref.get();
    const data = snap.data();

    return NextResponse.json(
      {
        id: snap.id,
        ...data,
        addedAt: serializeTimestamp(data.addedAt),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to add wishlist item",
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
      return proxyToBackend(request, `/wishlist/${params.productId}`);
    }

    const user = await authenticateRequest(request);

    const productId = String(params.productId || "").trim();
    if (!productId) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    await db.collection("users").doc(user.uid).collection("wishlist").doc(productId).delete();
    return NextResponse.json({ ok: true, productId });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to remove wishlist item",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
