import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../lib/serverApi";

export const dynamic = "force-dynamic";

function normalizeText(value) {
  return String(value || "").trim();
}

function formatNotification(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/product-notifications");
    }

    await requireAdminRequest(request);

    const snapshot = await db.collection("productNotifications").orderBy("createdAt", "desc").get();
    return NextResponse.json(snapshot.docs.map(formatNotification));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch notifications",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/product-notifications");
    }

    const user = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));
    const productId = normalizeText(body.productId);

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const notificationId = `${productId}_${user.uid}`;
    const ref = db.collection("productNotifications").doc(notificationId);
    const now = new Date();

    const payload = {
      productId,
      productName: normalizeText(body.productName) || "Product",
      productSlug: normalizeText(body.productSlug) || "",
      productImage: normalizeText(body.productImage) || "",
      userId: user.uid,
      userName: normalizeText(user.email?.split("@")?.[0]) || "Customer",
      userEmail: normalizeText(user.email),
      userPhotoURL: "",
      createdAt: now,
      updatedAt: now,
    };

    const userDoc = await db.collection("users").doc(user.uid).get().catch(() => null);
    if (userDoc?.exists) {
      const userData = userDoc.data() || {};
      payload.userName = normalizeText(userData.displayName) || payload.userName;
      payload.userPhotoURL = normalizeText(userData.photoURL);
      payload.userEmail = normalizeText(userData.email) || payload.userEmail;
    }

    await ref.set(payload, { merge: true });
    return NextResponse.json({ id: notificationId, ...payload }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to save notification",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
