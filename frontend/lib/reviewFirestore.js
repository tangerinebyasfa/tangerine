"use client";

import {
  auth,
  db,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  serverTimestamp,
} from "./firebase";
import { normalizeImageUrl } from "./image";

function mapDoc(document) {
  return { id: document.id, ...document.data() };
}

function normalizeText(value) {
  return String(value || "").trim();
}

function sortByLatestFirst(items) {
  const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  return [...items].sort((a, b) => toMillis(b?.createdAt) - toMillis(a?.createdAt));
}

export function listenToProductReviews(productId, onChange, onError) {
  const id = String(productId || "").trim();
  if (!db || !id) {
    onChange([]);
    return () => {};
  }

  const ref = query(collection(db, "productReviews", id, "items"), orderBy("createdAt", "desc"));
  return onSnapshot(ref, (snapshot) => onChange(snapshot.docs.map(mapDoc)), onError);
}

export function listenToUserReviews(userId, onChange, onError) {
  const id = String(userId || "").trim();
  if (!db || !id) {
    onChange([]);
    return () => {};
  }

  const ref = query(collection(db, "users", id, "reviews"), orderBy("createdAt", "desc"));
  return onSnapshot(ref, (snapshot) => onChange(sortByLatestFirst(snapshot.docs.map(mapDoc))), onError);
}

export function listenToAllReviews(onChange, onError) {
  if (!db) {
    onChange([]);
    return () => {};
  }

  const ref = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
  return onSnapshot(ref, (snapshot) => onChange(snapshot.docs.map(mapDoc)), onError);
}

export async function createReview(payload = {}) {
  if (!db) throw new Error("Firebase is not configured yet.");
  const user = auth?.currentUser;
  if (!user) throw new Error("Please sign in to continue.");

  const productId = normalizeText(payload.productId);
  const rating = Number(payload.rating);
  const comment = normalizeText(payload.comment);
  if (!productId) throw new Error("Invalid product id");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Invalid rating");
  if (comment.length < 3) throw new Error("Review comment is required");

  const reviewRef = doc(collection(db, "reviews"));
  const now = serverTimestamp();
  const productSlug = normalizeText(payload.productSlug);
  const productName = normalizeText(payload.productName);
  const productImage = normalizeImageUrl(payload.productImage) || "";
  const userId = normalizeText(payload.userId || user.uid);
  const userEmail = normalizeText(payload.userEmail || user.email);
  const userName =
    normalizeText(payload.userName) ||
    normalizeText(user.displayName) ||
    userEmail.split("@")[0] ||
    "Customer";
  const userPhotoURL = normalizeText(payload.userPhotoURL);
  const purchaseVerified = Boolean(payload.purchaseVerified);

  const publicReview = {
    reviewId: reviewRef.id,
    productId,
    productSlug,
    productName,
    productImage,
    userId,
    userName,
    userPhotoURL,
    rating,
    comment,
    purchaseVerified,
    createdAt: now,
    updatedAt: now,
  };

  const userReview = {
    ...publicReview,
    userEmail,
  };

  const masterReview = {
    ...userReview,
    verificationStatus: purchaseVerified ? "verified" : "unverified",
  };

  const batch = writeBatch(db);
  batch.set(reviewRef, masterReview);
  batch.set(doc(db, "productReviews", productId, "items", reviewRef.id), publicReview);
  batch.set(doc(db, "users", user.uid, "reviews", reviewRef.id), userReview);
  await batch.commit();

  return { id: reviewRef.id, ...masterReview };
}

export async function deleteReview(reviewId) {
  if (!db) throw new Error("Firebase is not configured yet.");
  const user = auth?.currentUser;
  if (!user) throw new Error("Please sign in to continue.");

  const id = normalizeText(reviewId);
  if (!id) throw new Error("Invalid review id");

  const reviewRef = doc(db, "reviews", id);
  const snap = await getDoc(reviewRef);
  if (!snap.exists()) throw new Error("Review not found");

  const review = snap.data();
  const batch = writeBatch(db);
  batch.delete(reviewRef);

  if (review?.productId) {
    batch.delete(doc(db, "productReviews", review.productId, "items", id));
  }

  batch.delete(doc(db, "users", review?.userId || user.uid, "reviews", id));
  await batch.commit();
  return { ok: true };
}
