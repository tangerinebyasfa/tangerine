import { NextResponse } from "next/server";
import { getAdminDb, requireAdminRequest } from "../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../lib/serverApi";

export const dynamic = "force-dynamic";

function normalizeText(value) {
  return String(value || "").trim();
}

export async function DELETE(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/reviews/${params.id}`);
    }

    await requireAdminRequest(request);

    const reviewId = normalizeText(params.id);
    if (!reviewId) {
      return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
    }

    const reviewRef = db.collection("reviews").doc(reviewId);
    const snap = await reviewRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const review = snap.data();
    const batch = db.batch();
    batch.delete(reviewRef);

    if (review?.productId) {
      batch.delete(db.collection("productReviews").doc(review.productId).collection("items").doc(reviewId));
    }

    if (review?.userId) {
      batch.delete(db.collection("users").doc(review.userId).collection("reviews").doc(reviewId));
    }

    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to delete review",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
