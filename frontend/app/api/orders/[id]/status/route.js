import { NextResponse } from "next/server";
import { getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../../../lib/serverApi";
import { normalizeOrderStatus } from "../../../../../lib/order";

export const dynamic = "force-dynamic";

function formatOrder(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    statusHistory: Array.isArray(data.statusHistory)
      ? data.statusHistory.map((entry) => ({
          ...entry,
          at: serializeTimestamp(entry.at),
        }))
      : [],
  };
}

function groupOrderQuantities(items = []) {
  return items.reduce((acc, item) => {
    const productId = String(item?.productId || "").trim();
    const quantity = Math.max(1, Number(item?.quantity || 1));
    if (!productId || quantity <= 0) return acc;
    acc.set(productId, (acc.get(productId) || 0) + quantity);
    return acc;
  }, new Map());
}

async function adjustInventoryForStatusChange(tx, db, orderSnap, nextStatus) {
  const data = orderSnap.data() || {};
  const previousStatus = normalizeOrderStatus(data.status);
  if (previousStatus === nextStatus) return;

  const shouldRestoreStock = previousStatus !== "cancelled" && nextStatus === "cancelled";
  const shouldConsumeStock = previousStatus === "cancelled" && nextStatus !== "cancelled";
  if (!shouldRestoreStock && !shouldConsumeStock) return;

  const quantities = groupOrderQuantities(Array.isArray(data.items) ? data.items : []);
  if (!quantities.size) return;

  const delta = shouldRestoreStock ? 1 : -1;
  const productRefs = [...quantities.keys()].map((productId) => db.collection("products").doc(productId));
  const productSnapshots = await Promise.all(productRefs.map((ref) => tx.get(ref)));

  productSnapshots.forEach((snap) => {
    const quantity = quantities.get(snap.id) || 0;
    if (!snap.exists || quantity <= 0) return;
    const product = snap.data() || {};
    if (typeof product.stock !== "number") return;

    tx.update(snap.ref, {
      stock: Math.max(0, Number(product.stock || 0) + delta * quantity),
      updatedAt: new Date(),
    });
  });
}

export async function PUT(request, { params }) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, `/orders/${params.id}/status`);
    }

    await requireAdminRequest(request);

    const body = await request.json().catch(() => ({}));
    const status = normalizeOrderStatus(body.status);

    const id = String(params.id || "").trim();
    const ref = db.collection("orders").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const now = new Date();
    const historyEntry = {
      status,
      at: now,
      by: "admin",
      note: body.note ? String(body.note).trim() : `Order marked ${status}`,
    };

    const applyUpdate = async (tx) => {
      const freshSnap = await tx.get(ref);
      if (!freshSnap.exists) {
        const error = new Error("Order not found");
        error.status = 404;
        throw error;
      }

      await adjustInventoryForStatusChange(tx, db, freshSnap, status);

      tx.update(ref, {
        status,
        updatedAt: now,
        statusHistory: [...(freshSnap.data()?.statusHistory || []), historyEntry],
        statusUpdatedAt: now,
        statusUpdatedBy: "admin",
      });
    };

    if (typeof db.runTransaction === "function") {
      await db.runTransaction(applyUpdate);
    } else {
      await applyUpdate({
        get: async (docRef) => docRef.get(),
        update: async (docRef, updates) => docRef.update(updates),
      });
    }
    const updated = await ref.get();
    return NextResponse.json(formatOrder(updated));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to update order",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}
