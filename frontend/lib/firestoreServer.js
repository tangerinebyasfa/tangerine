import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

const requiredKeys = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const hasConfig = requiredKeys.every(
  (key) => typeof firebaseConfig[key] === "string" && firebaseConfig[key].trim().length > 0
);

const app = hasConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
const db = app ? getFirestore(app) : null;

function assertDb() {
  if (!db) {
    throw new Error("Firebase is not configured for server reads.");
  }
}

function toPlainDoc(snapshot) {
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

function sortByCreatedAtDesc(a, b) {
  const aTime = a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime();
  const bTime = b.createdAt?.toMillis?.() ?? new Date(b.createdAt || 0).getTime();
  return bTime - aTime;
}

export async function getProducts(params = {}) {
  assertDb();

  const snapshot = await getDocs(collection(db, "products"));
  const products = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));

  return products
    .filter((product) => {
      if (params.category && product.categorySlug !== params.category) return false;
      if (params.type && (product.categoryParentType || product.productType) !== params.type) return false;
      if (params.featured === "true" && !product.featured) return false;
      return true;
    })
    .sort(sortByCreatedAtDesc);
}

export async function getProduct(id) {
  assertDb();

  const snapshot = await getDoc(doc(db, "products", id));
  if (snapshot.exists()) return toPlainDoc(snapshot);

  const slugSnapshot = await getDocs(query(collection(db, "products"), where("slug", "==", id)));
  if (!slugSnapshot.empty) return toPlainDoc(slugSnapshot.docs[0]);

  const allProducts = await getDocs(collection(db, "products"));
  const found = allProducts.docs.find((document) => slugify(document.data()?.name) === id);
  return found ? toPlainDoc(found) : null;
}

export async function getCategories() {
  assertDb();

  const snapshot = await getDocs(query(collection(db, "categories"), orderBy("name")));
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

export async function getCategory(idOrSlug) {
  assertDb();

  const directDoc = await getDoc(doc(db, "categories", idOrSlug));
  if (directDoc.exists()) return { id: directDoc.id, ...directDoc.data() };

  const categorySnapshot = await getDocs(
    query(collection(db, "categories"), where("slug", "==", idOrSlug))
  );
  if (!categorySnapshot.empty) {
    const found = categorySnapshot.docs[0];
    return { id: found.id, ...found.data() };
  }

  const subcategoryDoc = await getDoc(doc(db, "subcategories", idOrSlug));
  if (subcategoryDoc.exists()) return { id: subcategoryDoc.id, ...subcategoryDoc.data() };

  const subcategorySnapshot = await getDocs(
    query(collection(db, "subcategories"), where("slug", "==", idOrSlug))
  );
  if (!subcategorySnapshot.empty) {
    const found = subcategorySnapshot.docs[0];
    return { id: found.id, ...found.data() };
  }

  return null;
}

export async function getSubcategories() {
  assertDb();

  const snapshot = await getDocs(query(collection(db, "subcategories"), orderBy("name")));
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

export async function getSubcategory(idOrSlug) {
  assertDb();

  const directDoc = await getDoc(doc(db, "subcategories", idOrSlug));
  if (directDoc.exists()) return { id: directDoc.id, ...directDoc.data() };

  const snapshot = await getDocs(query(collection(db, "subcategories"), where("slug", "==", idOrSlug)));
  if (snapshot.empty) return null;

  const found = snapshot.docs[0];
  return { id: found.id, ...found.data() };
}
