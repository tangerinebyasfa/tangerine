"use client";

import { auth } from "./firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Thin wrapper around fetch that talks to the Express backend.
 * When `authRequired` is true (default for anything other than GET),
 * it attaches the current user's Firebase ID token as a Bearer token.
 */
async function request(path, { method = "GET", body, authRequired = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (authRequired) {
    if (!auth) throw new Error("Firebase is not configured yet.");
    const user = auth.currentUser;
    if (!user) throw new Error("You must be signed in to do that.");
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  // Products
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (body) => request("/products", { method: "POST", body, authRequired: true }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: "PUT", body, authRequired: true }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE", authRequired: true }),

  // Categories
  getCategories: () => request("/categories"),
  getCategory: (idOrSlug) => request(`/categories/${idOrSlug}`),
  createCategory: (body) => request("/categories", { method: "POST", body, authRequired: true }),
  updateCategory: (id, body) => request(`/categories/${id}`, { method: "PUT", body, authRequired: true }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE", authRequired: true }),
  getSubcategories: () => request("/subcategories"),
  getSubcategory: (idOrSlug) => request(`/subcategories/${idOrSlug}`),
  createSubcategory: (body) => request("/subcategories", { method: "POST", body, authRequired: true }),
  updateSubcategory: (id, body) => request(`/subcategories/${id}`, { method: "PUT", body, authRequired: true }),
  deleteSubcategory: (id) => request(`/subcategories/${id}`, { method: "DELETE", authRequired: true }),

  // Orders
  createOrder: (body) => request("/orders", { method: "POST", body, authRequired: true }),
  getMyOrders: () => request("/orders/mine", { authRequired: true }),
  getAllOrders: () => request("/orders", { authRequired: true }),
  updateOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, { method: "PUT", body: { status }, authRequired: true }),

  // Users
  syncUser: (body) => request("/users/sync", { method: "POST", body, authRequired: true }),
  getMe: () => request("/users/me", { authRequired: true }),
  updateMe: (body) => request("/users/me", { method: "PUT", body, authRequired: true }),
  getAllUsers: () => request("/users", { authRequired: true }),
  updateUserRole: (id, role) =>
    request(`/users/${id}/role`, { method: "PUT", body: { role }, authRequired: true }),
};
