import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../lib/serverApi";

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

export async function POST(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/orders");
    }

    const user = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ error: "Order must contain at least one item" }, { status: 400 });
    }

    const newOrder = {
      userId: user.uid,
      userEmail: user.email,
      items,
      shippingAddress: body.shippingAddress || {},
      paymentMethod: body.paymentMethod || "cod",
      subtotal: Number(body.subtotal) || 0,
      shipping: Number(body.shipping) || 0,
      total: Number(body.total) || 0,
      status: "pending",
      createdAt: new Date(),
    };

    const ref = await db.collection("orders").add(newOrder);
    return NextResponse.json({ id: ref.id, ...newOrder }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to create order",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/orders");
    }

    await requireAdminRequest(request);

    const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
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
