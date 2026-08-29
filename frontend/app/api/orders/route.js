import { NextResponse } from "next/server";
import { authenticateRequest, getAdminDb, requireAdminRequest, serializeTimestamp } from "../../../lib/firebaseAdmin";
import { proxyToBackend } from "../../../lib/serverApi";
import {
  createOrderSnapshot,
  formatOrderDateTime,
  generateReadableOrderId,
  getOrderDisplayId,
  normalizeCheckoutLineItem,
  normalizeMoney,
  normalizeOrderStatus,
  normalizePaymentStatus,
  summarizeShippingAddress,
} from "../../../lib/order";

export const dynamic = "force-dynamic";

const DEFAULT_SHIPPING = 8;

function serializeHistory(history = []) {
  return history.map((entry) => ({
    ...entry,
    at: serializeTimestamp(entry.at),
  }));
}

function serializeOrderDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    statusHistory: Array.isArray(data.statusHistory) ? serializeHistory(data.statusHistory) : [],
    displayOrderId: data.orderId || doc.id,
  };
}

function normalizeShippingAddress(address = {}, customerName = "", customerPhone = "") {
  return {
    label: String(address.label || "Shipping").trim(),
    fullName: String(address.fullName || customerName || "").trim(),
    line1: String(address.line1 || "").trim(),
    line2: String(address.line2 || "").trim(),
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim(),
    zip: String(address.zip || "").trim(),
    country: String(address.country || "India").trim(),
    phone: String(address.phone || customerPhone || "").trim(),
  };
}

function sanitizeOrderItems(rawItems = []) {
  return rawItems
    .map(normalizeCheckoutLineItem)
    .filter((item) => item.productId && item.quantity > 0);
}

function groupQuantitiesByProduct(items) {
  return items.reduce((acc, item) => {
    acc.set(item.productId, (acc.get(item.productId) || 0) + item.quantity);
    return acc;
  }, new Map());
}

function pickProductPrice(product) {
  const preferred = product?.salePrice ?? product?.compareAtPrice ?? product?.price ?? 0;
  return normalizeMoney(preferred);
}

function getProductImage(product) {
  return (
    String(product?.image || "").trim() ||
    String(Array.isArray(product?.images) ? product.images[0] || "" : "").trim() ||
    ""
  );
}

function enrichOrderItems(rawItems, productMap) {
  return rawItems.map((item) => {
    const product = productMap.get(item.productId) || {};
    const unitPrice = pickProductPrice(product);
    const lineTotal = unitPrice * item.quantity;

    return {
      productId: item.productId,
      productSlug: product.slug || item.slug || "",
      productName: product.name || item.name || "Product",
      productImage: getProductImage(product) || item.image || "",
      size: item.size || "",
      color: item.color || "",
      quantity: item.quantity,
      unitPrice,
      lineTotal,
    };
  });
}

async function createOrderDocument(db, user, body) {
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = sanitizeOrderItems(rawItems);

  if (!items.length) {
    const error = new Error("Order must contain at least one item");
    error.status = 400;
    throw error;
  }

  const customerName = String(body.customerName || body.fullName || body.shippingAddress?.fullName || user.email?.split("@")[0] || "").trim();
  const customerEmail = String(body.customerEmail || user.email || "").trim();
  const customerPhone = String(body.customerPhone || body.shippingAddress?.phone || "").trim();
  const shippingAddress = normalizeShippingAddress(body.shippingAddress, customerName, customerPhone);
  const shippingAddressSummary = summarizeShippingAddress(shippingAddress);
  const paymentMethod = String(body.paymentMethod || "cod").trim().toLowerCase();
  const paymentStatus = normalizePaymentStatus(body.paymentStatus || "pending");
  const orderStatus = normalizeOrderStatus(body.status || "pending");
  const discount = normalizeMoney(body.discount, 0);
  const couponCode = String(body.couponCode || "").trim();
  const notes = String(body.notes || "").trim();
  const shipping = normalizeMoney(body.shipping, DEFAULT_SHIPPING);
  const snapshot = createOrderSnapshot({
    items,
    subtotal: body.subtotal,
    shipping,
    discount,
    total: body.total,
  });

  const groupedQuantities = groupQuantitiesByProduct(items);
  const orderId = generateReadableOrderId();
  const orderRef = db.collection("orders").doc(orderId);
  const productRefs = [...groupedQuantities.keys()].map((productId) => db.collection("products").doc(productId));

  await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (orderSnap.exists) {
      const error = new Error("Order id collision. Please try again.");
      error.status = 409;
      throw error;
    }

    const productSnapshots = await Promise.all(productRefs.map((ref) => tx.get(ref)));
    const productMap = new Map();

    productSnapshots.forEach((snap) => {
      if (snap.exists) {
        productMap.set(snap.id, snap.data());
      }
    });

    for (const [productId, quantityNeeded] of groupedQuantities.entries()) {
      const product = productMap.get(productId);
      if (!product) {
        const error = new Error(`Product not found: ${productId}`);
        error.status = 404;
        throw error;
      }

      if (typeof product.stock === "number" && product.stock < quantityNeeded) {
        const error = new Error(`Only ${product.stock} left in stock for ${product.name || productId}.`);
        error.status = 409;
        throw error;
      }
    }

    const enrichedItems = enrichOrderItems(items, productMap);
    const subtotal = enrichedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const total = Math.max(0, subtotal + snapshot.shipping - snapshot.discount);
    const now = new Date();

    productSnapshots.forEach((snap) => {
      const qty = groupedQuantities.get(snap.id) || 0;
      if (qty > 0 && typeof snap.data()?.stock === "number") {
        tx.update(snap.ref, {
          stock: Math.max(0, Number(snap.data().stock || 0) - qty),
          updatedAt: now,
        });
      }
    });

    tx.set(orderRef, {
      orderId,
      orderNumber: orderId,
      userId: user.uid,
      userUid: user.uid,
      userEmail: customerEmail,
      userPhone: customerPhone || null,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      shippingAddress,
      shippingAddressSummary,
      items: enrichedItems,
      itemCount: enrichedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      subtotal,
      discount: snapshot.discount,
      discountCode: couponCode || null,
      shipping: snapshot.shipping,
      total,
      currency: snapshot.currency,
      paymentMethod,
      paymentStatus,
      paymentReference: body.paymentReference || null,
      paymentProvider: body.paymentProvider || null,
      status: orderStatus,
      statusHistory: [
        {
          status: orderStatus,
          at: now,
          note: "Order placed",
          by: user.uid,
        },
      ],
      notes: notes || null,
      source: "checkout",
      createdAt: now,
      updatedAt: now,
    });
  });

  const created = await orderRef.get();
  return serializeOrderDoc(created);
}

export async function POST(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/orders");
    }

    const user = await authenticateRequest(request);
    const body = await request.json().catch(() => ({}));
    const createdOrder = await createOrderDocument(db, user, body);

    return NextResponse.json(createdOrder, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to create order",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

export async function GET(request) {
  try {
    const db = getAdminDb();
    if (!db) {
      return proxyToBackend(request, "/orders");
    }

    await requireAdminRequest(request);

    const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
    return NextResponse.json(snapshot.docs.map(serializeOrderDoc));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Failed to fetch orders",
        detail: process.env.NODE_ENV === "production" ? undefined : error.message,
      },
      { status: error.status || 500 }
    );
  }
}

