"use client";

import { auth, db, collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, serverTimestamp } from "./firebase";

function normalizeId(value) {
  return String(value || "").trim();
}

function wishlistCollection(uid) {
  return collection(db, "users", uid, "wishlist");
}

async function requestApi(path, { method = "GET", body, authRequired = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (authRequired) {
    if (!auth) throw new Error("Firebase is not configured yet.");
    const user = auth.currentUser;
    if (!user) throw new Error("Please sign in to use the wishlist.");
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

async function readWishlistFromFirestore() {
  if (!db || !auth?.currentUser) return [];

  const snapshot = await getDocs(query(wishlistCollection(auth.currentUser.uid), orderBy("addedAt", "desc")));
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

export async function getWishlist() {
  try {
    return await readWishlistFromFirestore();
  } catch (firestoreError) {
    try {
      return await requestApi("/wishlist", { authRequired: true });
    } catch (apiError) {
      throw firestoreError || apiError;
    }
  }
}

export async function addWishlistItem(productId) {
  const id = normalizeId(productId);
  if (!id) throw new Error("Invalid product id");

  try {
    if (!db || !auth?.currentUser) throw new Error("Please sign in to use the wishlist.");

    await setDoc(
      doc(db, "users", auth.currentUser.uid, "wishlist", id),
      {
        productId: id,
        addedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { id, productId: id };
  } catch (firestoreError) {
    try {
      return await requestApi(`/wishlist/${encodeURIComponent(id)}`, {
        method: "POST",
        authRequired: true,
      });
    } catch (apiError) {
      throw firestoreError || apiError;
    }
  }
}

export async function removeWishlistItem(productId) {
  const id = normalizeId(productId);
  if (!id) throw new Error("Invalid product id");

  try {
    if (!db || !auth?.currentUser) throw new Error("Please sign in to use the wishlist.");

    await deleteDoc(doc(db, "users", auth.currentUser.uid, "wishlist", id));
    return { ok: true, productId: id };
  } catch (firestoreError) {
    try {
      return await requestApi(`/wishlist/${encodeURIComponent(id)}`, {
        method: "DELETE",
        authRequired: true,
      });
    } catch (apiError) {
      throw firestoreError || apiError;
    }
  }
}
