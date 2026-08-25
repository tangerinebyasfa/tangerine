"use client";

import { auth } from "./firebase";

async function request(path, { method = "GET", body, authRequired = false } = {}) {
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

export async function getWishlist() {
  return request("/wishlist", { authRequired: true });
}

export async function addWishlistItem(productId) {
  return request(`/wishlist/${encodeURIComponent(String(productId || "").trim())}`, {
    method: "POST",
    authRequired: true,
  });
}

export async function removeWishlistItem(productId) {
  return request(`/wishlist/${encodeURIComponent(String(productId || "").trim())}`, {
    method: "DELETE",
    authRequired: true,
  });
}
