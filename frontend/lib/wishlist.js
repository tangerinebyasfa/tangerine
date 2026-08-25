"use client";

import { auth, db, collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, serverTimestamp } from "./firebase";

function normalizeId(value) {
  return String(value || "").trim();
}

function wishlistCollection(uid) {
  return collection(db, "users", uid, "wishlist");
}

async function requireUser() {
  const user = auth?.currentUser || null;
  if (!user) {
    throw new Error("Please sign in to use the wishlist.");
  }
  return user;
}

export async function getWishlist() {
  if (!db || !auth) return [];

  const user = auth.currentUser;
  if (!user) return [];

  const snapshot = await getDocs(query(wishlistCollection(user.uid), orderBy("addedAt", "desc")));
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

export async function addWishlistItem(productId) {
  if (!db || !auth) throw new Error("Firebase is not configured yet.");

  const user = await requireUser();
  const id = normalizeId(productId);
  if (!id) throw new Error("Invalid product id");

  await setDoc(
    doc(db, "users", user.uid, "wishlist", id),
    {
      productId: id,
      addedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { id, productId: id };
}

export async function removeWishlistItem(productId) {
  if (!db || !auth) throw new Error("Firebase is not configured yet.");

  const user = await requireUser();
  const id = normalizeId(productId);
  if (!id) throw new Error("Invalid product id");

  await deleteDoc(doc(db, "users", user.uid, "wishlist", id));
  return { ok: true, productId: id };
}
