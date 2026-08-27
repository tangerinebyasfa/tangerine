import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const VERIFIED_ORDER_STATUSES = new Set(["delivered", "completed", "fulfilled"]);

function normalizeText(value) {
  return String(value || "").trim();
}

function toReviewPayload(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

function hasPurchasedProduct(order, productId, productSlug) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.some((item) => {
    const itemId = normalizeText(item?.productId);
    const itemSlug = normalizeText(item?.slug || item?.productSlug);
    return itemId === productId || itemSlug === productSlug;
  });
}

async function resolveProduct(db, productId) {
  const normalized = normalizeText(productId);
  if (!normalized) return null;

  const direct = await db.collection("products").doc(normalized).get();
  if (direct.exists) {
    return { id: direct.id, ...direct.data() };
  }

  const slugSnapshot = await db.collection("products").where("slug", "==", normalized).limit(1).get();
  if (!slugSnapshot.empty) {
    const doc = slugSnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  return null;
}

async function resolveUserProfile(db, userId) {
  const snap = await db.collection("users").doc(userId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function POST(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        {
          error: "Firebase Admin is not configured",
        },
        { status: 500 }
      );
    }

    const user = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));
    const productId = normalizeText(body.productId);
    const rating = Number(body.rating);
    const comment = normalizeText(body.comment);

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be an integer between 1 and 5" }, { status: 400 });
    }

    if (comment.length < 3) {
      return NextResponse.json({ error: "comment is required" }, { status: 400 });
    }

    const product = await resolveProduct(db, productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const profile = await resolveUserProfile(db, user.uid);
    const userName =
      normalizeText(profile?.displayName) ||
      normalizeText(user.email?.split("@")?.[0]) ||
      "Customer";

    const ordersSnapshot = await db.collection("orders").where("userId", "==", user.uid).get();
    const purchaseVerified = ordersSnapshot.docs.some((orderDoc) => {
      const order = orderDoc.data();
      const status = normalizeText(order?.status).toLowerCase();
      return VERIFIED_ORDER_STATUSES.has(status) && hasPurchasedProduct(order, product.id, product.slug);
    });

    const reviewRef = db.collection("reviews").doc();
    const reviewData = {
      productId: product.id,
      productSlug: product.slug || "",
      productName: product.name || "",
      productImage: Array.isArray(product.images) && product.images.length ? product.images[0] : "",
      userId: user.uid,
      userEmail: user.email || "",
      userName,
      userPhotoURL: profile?.photoURL || null,
      rating,
      comment,
      purchaseVerified,
      verificationStatus: purchaseVerified ? "verified" : "unverified",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const publicReview = {
      reviewId: reviewRef.id,
      productId: reviewData.productId,
      productSlug: reviewData.productSlug,
      productName: reviewData.productName,
      productImage: reviewData.productImage,
      userId: reviewData.userId,
      userName: reviewData.userName,
      userPhotoURL: reviewData.userPhotoURL,
      rating: reviewData.rating,
      comment: reviewData.comment,
      purchaseVerified: reviewData.purchaseVerified,
      createdAt: reviewData.createdAt,
      updatedAt: reviewData.updatedAt,
    };

    const userReview = {
      ...publicReview,
      userEmail: reviewData.userEmail,
    };

    const batch = db.batch();
    batch.set(reviewRef, reviewData);
    batch.set(db.collection("productReviews").doc(product.id).collection("items").doc(reviewRef.id), publicReview);
    batch.set(db.collection("users").doc(user.uid).collection("reviews").doc(reviewRef.id), userReview);
    await batch.commit();

    return NextResponse.json({ id: reviewRef.id, ...reviewData, createdAt: reviewData.createdAt.toISOString(), updatedAt: reviewData.updatedAt.toISOString() }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to create review",
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
      return NextResponse.json(
        {
          error: "Firebase Admin is not configured",
        },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const productId = normalizeText(url.searchParams.get("productId"));
    const userId = normalizeText(url.searchParams.get("userId"));
    const verified = url.searchParams.get("verified");

    const isPublicProductFeed = Boolean(productId) && !userId && verified === null;
    if (!isPublicProductFeed) {
      await requireAdminRequest(request);
    }

    const snapshot = await db.collection("reviews").orderBy("createdAt", "desc").get();
    let reviews = snapshot.docs.map(toReviewPayload);

    if (productId) {
      reviews = reviews.filter((review) => normalizeText(review.productId) === productId || normalizeText(review.productSlug) === productId);
    }

    if (userId) {
      reviews = reviews.filter((review) => normalizeText(review.userId) === userId);
    }

    if (verified === "true" || verified === "false") {
      const shouldBeVerified = verified === "true";
      reviews = reviews.filter((review) => Boolean(review.purchaseVerified) === shouldBeVerified);
    }

    return NextResponse.json(reviews);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch reviews",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
