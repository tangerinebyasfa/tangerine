"use client";

import {
  db,
  collection,
  doc as fsDoc,
  getDoc as fsGetDoc,
  getDocs as fsGetDocs,
  query as fsQuery,
  where as fsWhere,
  orderBy as fsOrderBy,
} from "./firebase";
import { auth } from "./firebase";

function resolveApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (process.env.NODE_ENV === "production") {
    if (!configuredUrl) return "/api";

    const isLocalhostUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(configuredUrl);
    return isLocalhostUrl ? "/api" : configuredUrl;
  }

  return configuredUrl || "http://localhost:5000/api";
}

const API_URL = resolveApiUrl();

async function readCollection(collectionName, { orderByField = null } = {}) {
  if (!db) throw new Error("Firebase is not configured yet.");

  const colRef = collection(db, collectionName);
  const queryRef = orderByField ? fsQuery(colRef, fsOrderBy(orderByField)) : colRef;
  const snapshot = await fsGetDocs(queryRef);

  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

async function readDoc(collectionName, id) {
  if (!db) throw new Error("Firebase is not configured yet.");

  const snapshot = await fsGetDoc(fsDoc(db, collectionName, id));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

async function readByField(collectionName, field, value) {
  if (!db) throw new Error("Firebase is not configured yet.");

  const snapshot = await fsGetDocs(fsQuery(collection(db, collectionName), fsWhere(field, "==", value)));
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

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
  getProducts: async (params = {}) => {
    if (db) {
      const products = await readCollection("products");

      return products
        .filter((product) => {
          if (params.category && product.categorySlug !== params.category) return false;
          if (params.type && (product.categoryParentType || product.productType) !== params.type) return false;
          if (params.featured === "true" && !product.featured) return false;
          return true;
        })
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime();
          const bTime = b.createdAt?.toMillis?.() ?? new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        });
    }

    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  getProduct: async (id) => {
    if (db) {
      return readDoc("products", id);
    }

    return request(`/products/${id}`);
  },
  createProduct: (body) => request("/products", { method: "POST", body, authRequired: true }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: "PUT", body, authRequired: true }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE", authRequired: true }),

  // Categories
  getCategories: () => {
    if (db) return readCollection("categories", { orderByField: "name" });
    return request("/categories");
  },
  getCategory: async (idOrSlug) => {
    if (db) {
      return (
        (await readDoc("categories", idOrSlug)) ||
        (await readByField("categories", "slug", idOrSlug)) ||
        (await readDoc("subcategories", idOrSlug)) ||
        (await readByField("subcategories", "slug", idOrSlug))
      );
    }

    return request(`/categories/${idOrSlug}`);
  },
  createCategory: (body) => request("/categories", { method: "POST", body, authRequired: true }),
  updateCategory: (id, body) => request(`/categories/${id}`, { method: "PUT", body, authRequired: true }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE", authRequired: true }),
  getSubcategories: () => {
    if (db) return readCollection("subcategories", { orderByField: "name" });
    return request("/subcategories");
  },
  getSubcategory: async (idOrSlug) => {
    if (db) {
      return (await readDoc("subcategories", idOrSlug)) || (await readByField("subcategories", "slug", idOrSlug));
    }

    return request(`/subcategories/${idOrSlug}`);
  },
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
