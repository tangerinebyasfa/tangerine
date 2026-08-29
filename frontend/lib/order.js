export const ORDER_PREFIX = "TGNR";
export const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

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

function pad(value, size = 2) {
  return String(value).padStart(size, "0");
}

export function generateReadableOrderId(date = new Date()) {
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");

  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${ORDER_PREFIX}-${stamp}-${random}`;
}

export function normalizeMoney(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeOrderStatus(status) {
  const value = normalizeText(status).toLowerCase();
  return ORDER_STATUSES.includes(value) ? value : "pending";
}

export function normalizePaymentStatus(status) {
  const value = normalizeText(status).toLowerCase();
  return PAYMENT_STATUSES.includes(value) ? value : "pending";
}

export function getOrderItemCount(order) {
  if (!Array.isArray(order?.items)) return 0;
  return order.items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
}

export function getOrderDisplayId(order) {
  return normalizeText(order?.orderId) || normalizeText(order?.orderNumber) || normalizeText(order?.id);
}

export function formatOrderDate(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatOrderDateTime(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function summarizeShippingAddress(address) {
  if (!address) return "";

  const parts = [
    address.fullName,
    address.line1,
    address.line2,
    [address.city, address.state, address.zip].filter(Boolean).join(", "),
    address.country,
    address.phone,
  ].filter(Boolean);

  return parts.join(", ");
}

export function formatOrderItemLabel(item) {
  const bits = [item?.name || "Product"];
  if (item?.size) bits.push(`Size ${item.size}`);
  if (item?.color) bits.push(item.color);
  return bits.join(" | ");
}

export function mapOrderDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function normalizeCheckoutLineItem(item = {}) {
  const quantity = Math.max(1, Number(item.quantity || 1));
  const unitPrice = normalizeMoney(item.unitPrice ?? item.price ?? 0);
  const lineTotal = normalizeMoney(item.lineTotal ?? unitPrice * quantity);

  return {
    productId: normalizeText(item.productId),
    slug: normalizeText(item.slug),
    name: normalizeText(item.name) || "Product",
    image: normalizeText(item.image),
    size: normalizeText(item.size),
    color: normalizeText(item.color),
    quantity,
    unitPrice,
    lineTotal,
  };
}

export function createOrderSnapshot(payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items.map(normalizeCheckoutLineItem) : [];
  const subtotal = normalizeMoney(payload.subtotal, items.reduce((sum, item) => sum + item.lineTotal, 0));
  const shipping = normalizeMoney(payload.shipping, 0);
  const discount = normalizeMoney(payload.discount, 0);
  const total = normalizeMoney(payload.total, subtotal + shipping - discount);

  return {
    items,
    subtotal,
    shipping,
    discount,
    total,
    currency: normalizeText(payload.currency) || "INR",
  };
}
