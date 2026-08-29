import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, serializeTimestamp } from "../../../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../../../lib/serverApi";

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

function syncDefaultAddressMirror(batch, db, uid, addressId, addressData) {
  batch.set(
    db.collection("users").doc(uid),
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

async function setDefaultAddress(db, uid, id) {
  const addressesRef = db.collection("users").doc(uid).collection("addresses");
  const snapshot = await addressesRef.get();
  if (snapshot.empty) throw new Error("Add an address first.");

  const target = snapshot.docs.find((addressDoc) => addressDoc.id === id);
  if (!target) throw new Error("Address not found.");

  const batch = db.batch();

  snapshot.docs.forEach((addressDoc) => {
    batch.update(addressDoc.ref, {
      isDefault: addressDoc.id === id,
      updatedAt: new Date(),
    });
  });

  syncDefaultAddressMirror(batch, db, uid, id, target.data());
  await batch.commit();
  return { id };
}

export async function PUT(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/users/me/addresses/${params.addressId}`);
    }

    const user = await authenticateRequest(request);
    const id = normalizeText(params?.addressId);
    if (!id) {
      return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const ref = db.collection("users").doc(user.uid).collection("addresses").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    const normalized = normalizeAddressPayload({
      ...snap.data(),
      ...body,
      isDefault: snap.data()?.isDefault,
    });

    const { isDefault, ...updates } = normalized;
    await ref.set(
      {
        ...updates,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    if (body?.isDefault) {
      await setDefaultAddress(db, user.uid, id);
    }

    return NextResponse.json({
      id,
      ...updates,
      isDefault: snap.data()?.isDefault || false,
      createdAt: serializeTimestamp(snap.data()?.createdAt),
      updatedAt: serializeTimestamp(new Date()),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to update address",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/users/me/addresses/${params.addressId}`);
    }

    const user = await authenticateRequest(request);
    const id = normalizeText(params?.addressId);
    if (!id) {
      return NextResponse.json({ error: "Invalid address id" }, { status: 400 });
    }

    const addressRef = db.collection("users").doc(user.uid).collection("addresses").doc(id);
    const snap = await addressRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    const addressesRef = db.collection("users").doc(user.uid).collection("addresses");
    const remainingSnapshot = await addressesRef.get();
    const remaining = remainingSnapshot.docs.filter((addressDoc) => addressDoc.id !== id);
    const batch = db.batch();
    batch.delete(addressRef);

    if (snap.data()?.isDefault && remaining.length > 0) {
      const nextDefault = sortAddresses(remaining.map(mapAddressDoc))[0];

      remaining.forEach((addressDoc) => {
        batch.update(addressDoc.ref, {
          isDefault: addressDoc.id === nextDefault.id,
          updatedAt: new Date(),
        });
      });

      syncDefaultAddressMirror(batch, db, user.uid, nextDefault.id, nextDefault);
    } else if (snap.data()?.isDefault) {
      batch.set(
        db.collection("users").doc(user.uid),
        {
          defaultAddressId: null,
          defaultAddress: null,
          address: null,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to delete address",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
