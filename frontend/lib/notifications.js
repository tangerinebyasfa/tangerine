"use client";

import {
  auth,
} from "./firebase";

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function ensureUser() {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error("Please sign in to continue.");
  }
  return user;
}

async function requestLocalApi(path, { method = "GET", body, authRequired = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (authRequired) {
    const user = auth?.currentUser;
    if (!user) throw new Error("You must be signed in to do that.");
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

export async function addProductNotification(product) {
  const user = ensureUser();
  const productId = normalizeId(product?.id);
  if (!productId) throw new Error("Invalid product id");

  return requestLocalApi("/product-notifications", {
    method: "POST",
    authRequired: true,
    body: {
      productId,
      productName: normalizeText(product?.name) || "Product",
      productSlug: normalizeText(product?.slug) || "",
      productImage: Array.isArray(product?.images) ? normalizeText(product.images[0]) : "",
    },
  });
}

export async function getProductNotifications() {
  return requestLocalApi("/product-notifications", { authRequired: true });
}

export function listenToProductNotifications(onChange, onError) {
  let active = true;

  const load = async () => {
    try {
      const items = await getProductNotifications();
      if (active) onChange(Array.isArray(items) ? items : []);
    } catch (error) {
      if (active && onError) onError(error);
    }
  };

  load();
  const interval = setInterval(load, 10000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}
