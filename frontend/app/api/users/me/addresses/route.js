import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, serializeTimestamp } from "../../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../../lib/serverApi";

export const dynamic = "force-dynamic";

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeAddressPayload(payload = {}) {
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

function buildAddressSummary(address) {
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

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
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

function mapAddressDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

function syncDefaultAddressMirror(batch, uid, addressId, addressData) {
  batch.set(
    getAdminDb().collection("users").doc(uid),
    {
      defaultAddressId: addressId,
      defaultAddress: {
        id: addressId,
        ...addressData,
      },
      address: buildAddressSummary(addressData),
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/users/me/addresses");
    }

    const user = await authenticateRequest(request);
    const snapshot = await db.collection("users").doc(user.uid).collection("addresses").get();
    const addresses = sortAddresses(snapshot.docs.map(mapAddressDoc));

    return NextResponse.json(addresses);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch addresses",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/users/me/addresses");
    }

    const user = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));
    const normalized = normalizeAddressPayload(body);
    const addressesRef = db.collection("users").doc(user.uid).collection("addresses");
    const existing = await addressesRef.get();
    const shouldDefault = normalized.isDefault || existing.empty;
    const batch = db.batch();
    const addressRef = addressesRef.doc();

    if (shouldDefault) {
      existing.docs.forEach((addressDoc) => {
        batch.update(addressDoc.ref, {
          isDefault: false,
          updatedAt: new Date(),
        });
      });
    }

    batch.set(addressRef, {
      ...normalized,
      isDefault: shouldDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (shouldDefault) {
      syncDefaultAddressMirror(batch, user.uid, addressRef.id, normalized);
    }

    await batch.commit();

    return NextResponse.json(
      {
        id: addressRef.id,
        ...normalized,
        isDefault: shouldDefault,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to create address",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
