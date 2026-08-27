"use client";

import {
  auth,
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "./firebase";

function normalizeText(value) {
  return String(value || "").trim();
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function ensureDb() {
  if (!db) {
    throw new Error("Firebase is not configured yet.");
  }
}

function ensureUser() {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error("Please sign in to continue.");
  }
  return user;
}

export function buildAddressSummary(address) {
  if (!address) return "";

  const parts = [
    address.label,
    address.fullName,
    address.line1,
    address.line2,
    [address.city, address.state, address.zip].filter(Boolean).join(", "),
    address.country,
    address.phone,
  ].filter(Boolean);

  return parts.join(", ");
}

export function normalizeAddressPayload(payload = {}) {
  const normalized = {
    label: normalizeText(payload.label) || "Home",
    fullName: normalizeText(payload.fullName),
    line1: normalizeText(payload.line1),
    line2: normalizeText(payload.line2),
    city: normalizeText(payload.city),
    state: normalizeText(payload.state),
    zip: normalizeText(payload.zip),
    country: normalizeText(payload.country) || "India",
    phone: normalizeText(payload.phone),
    isDefault: Boolean(payload.isDefault),
  };

  if (!normalized.fullName) throw new Error("Full name is required.");
  if (!normalized.line1) throw new Error("Address line 1 is required.");
  if (!normalized.city) throw new Error("City is required.");
  if (!normalized.state) throw new Error("State is required.");
  if (!normalized.zip) throw new Error("ZIP / postal code is required.");
  if (!normalized.phone) throw new Error("Phone is required.");

  return normalized;
}

function mapDoc(document) {
  return { id: document.id, ...document.data() };
}

function sortByLatestFirst(items, field = "createdAt") {
  return [...items].sort((a, b) => toMillis(b?.[field]) - toMillis(a?.[field]));
}

function sortAddresses(items) {
  return [...items].sort((a, b) => {
    const defaultRank = Number(Boolean(b?.isDefault)) - Number(Boolean(a?.isDefault));
    if (defaultRank !== 0) return defaultRank;
    const updatedRank = toMillis(b?.updatedAt) - toMillis(a?.updatedAt);
    if (updatedRank !== 0) return updatedRank;
    return toMillis(b?.createdAt) - toMillis(a?.createdAt);
  });
}

function syncDefaultAddressMirror(batch, uid, addressId, addressData) {
  batch.set(
    doc(db, "users", uid),
    {
      defaultAddressId: addressId,
      defaultAddress: {
        id: addressId,
        ...addressData,
      },
      address: buildAddressSummary(addressData),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function listenToUserOrders(uid, onChange, onError) {
  if (!db || !uid) {
    onChange([]);
    return () => {};
  }

  const ref = query(collection(db, "orders"), where("userId", "==", uid));
  return onSnapshot(
    ref,
    (snapshot) => {
      const orders = sortByLatestFirst(snapshot.docs.map(mapDoc));
      onChange(orders);
    },
    onError
  );
}

export function listenToUserAddresses(uid, onChange, onError) {
  if (!db || !uid) {
    onChange([]);
    return () => {};
  }

  const ref = collection(db, "users", uid, "addresses");
  return onSnapshot(
    ref,
    (snapshot) => {
      const addresses = sortAddresses(snapshot.docs.map(mapDoc));
      onChange(addresses);
    },
    onError
  );
}

export function listenToUserWishlist(uid, onChange, onError) {
  if (!db || !uid) {
    onChange([]);
    return () => {};
  }

  const ref = collection(db, "users", uid, "wishlist");
  return onSnapshot(
    ref,
    (snapshot) => {
      const items = sortByLatestFirst(snapshot.docs.map(mapDoc), "addedAt");
      onChange(items);
    },
    onError
  );
}

export async function loadProductsByIds(ids = []) {
  ensureDb();

  const uniqueIds = [...new Set(ids.map(normalizeText).filter(Boolean))];
  const snapshots = await Promise.all(uniqueIds.map((id) => getDoc(doc(db, "products", id))));

  return snapshots.filter((snapshot) => snapshot.exists()).map((snapshot) => mapDoc(snapshot));
}

export async function addWishlistItem(productId) {
  ensureDb();
  const user = ensureUser();
  const id = normalizeText(productId);
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
  ensureDb();
  const user = ensureUser();
  const id = normalizeText(productId);
  if (!id) throw new Error("Invalid product id");

  await deleteDoc(doc(db, "users", user.uid, "wishlist", id));
  return { ok: true, productId: id };
}

export async function createAddress(payload) {
  ensureDb();
  const user = ensureUser();
  const normalized = normalizeAddressPayload(payload);
  const addressesRef = collection(db, "users", user.uid, "addresses");
  const existing = await getDocs(addressesRef);
  const addressRef = doc(addressesRef);
  const shouldDefault = normalized.isDefault || existing.empty;
  const batch = writeBatch(db);

  if (shouldDefault) {
    existing.docs.forEach((addressDoc) => {
      batch.update(addressDoc.ref, {
        isDefault: false,
        updatedAt: serverTimestamp(),
      });
    });
  }

  batch.set(addressRef, {
    ...normalized,
    isDefault: shouldDefault,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (shouldDefault) {
    syncDefaultAddressMirror(batch, user.uid, addressRef.id, normalized);
  }

  await batch.commit();
  return { id: addressRef.id, ...normalized, isDefault: shouldDefault };
}

export async function updateAddress(addressId, payload) {
  ensureDb();
  const user = ensureUser();
  const id = normalizeText(addressId);
  if (!id) throw new Error("Invalid address id");

  const ref = doc(db, "users", user.uid, "addresses", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Address not found.");

  const normalized = normalizeAddressPayload({
    ...snap.data(),
    ...payload,
    isDefault: snap.data()?.isDefault,
  });
  const { isDefault, ...updates } = normalized;

  await setDoc(
    ref,
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (payload?.isDefault) {
    await setDefaultAddress(id);
  }

  return { id, ...updates, isDefault: snap.data()?.isDefault || false };
}

export async function setDefaultAddress(addressId) {
  ensureDb();
  const user = ensureUser();
  const id = normalizeText(addressId);
  if (!id) throw new Error("Invalid address id");

  const addressesRef = collection(db, "users", user.uid, "addresses");
  const snapshot = await getDocs(addressesRef);
  if (snapshot.empty) throw new Error("Add an address first.");

  const target = snapshot.docs.find((addressDoc) => addressDoc.id === id);
  if (!target) throw new Error("Address not found.");

  const batch = writeBatch(db);

  snapshot.docs.forEach((addressDoc) => {
    batch.update(addressDoc.ref, {
      isDefault: addressDoc.id === id,
      updatedAt: serverTimestamp(),
    });
  });

  syncDefaultAddressMirror(batch, user.uid, id, target.data());
  await batch.commit();
  return { id };
}

export async function deleteAddress(addressId) {
  ensureDb();
  const user = ensureUser();
  const id = normalizeText(addressId);
  if (!id) throw new Error("Invalid address id");

  const addressRef = doc(db, "users", user.uid, "addresses", id);
  const snap = await getDoc(addressRef);
  if (!snap.exists()) throw new Error("Address not found.");

  const addressesRef = collection(db, "users", user.uid, "addresses");
  const remainingSnapshot = await getDocs(addressesRef);
  const remaining = remainingSnapshot.docs.filter((addressDoc) => addressDoc.id !== id);
  const batch = writeBatch(db);
  batch.delete(addressRef);

  if (snap.data()?.isDefault && remaining.length > 0) {
    const nextDefault = sortAddresses(remaining.map(mapDoc))[0];

    remaining.forEach((addressDoc) => {
      batch.update(addressDoc.ref, {
        isDefault: addressDoc.id === nextDefault.id,
        updatedAt: serverTimestamp(),
      });
    });

    syncDefaultAddressMirror(batch, user.uid, nextDefault.id, nextDefault);
  } else if (snap.data()?.isDefault) {
    batch.set(
      doc(db, "users", user.uid),
      {
        defaultAddressId: null,
        defaultAddress: null,
        address: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
  return { ok: true, id };
}

