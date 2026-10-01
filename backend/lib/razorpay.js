const { createHmac, timingSafeEqual } = require('node:crypto');

// Razorpay amounts are integers in paise; the rest of the store works in rupees.
const toPaise = (rupees) => Math.round(Number(rupees) * 100);
const toRupees = (paise) => Math.round(Number(paise)) / 100;

function isConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

// Public key id for the browser, or null when payments are not configured.
function keyId() {
  return process.env.RAZORPAY_KEY_ID?.trim() || null;
}

function requireKeyId() {
  const id = keyId();
  if (!id) throw Object.assign(new Error('Payments are not configured yet.'), { status: 503 });
  return id;
}

let client;
function getClient() {
  if (!isConfigured()) throw Object.assign(new Error('Payments are not configured yet.'), { status: 503 });
  if (!client) {
    // Required lazily so the server still boots without payment credentials.
    const Razorpay = require('razorpay');
    client = new Razorpay({ key_id: requireKeyId(), key_secret: process.env.RAZORPAY_KEY_SECRET.trim() });
  }
  return client;
}

// Constant-time compare that tolerates length/encoding differences.
function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

// Mandatory per Razorpay docs: HMAC-SHA256(order_id + "|" + payment_id, key_secret).
// Never trust the order_id supplied by the browser; pass the one stored on the order.
function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) return false;
  const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET?.trim() || '')
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return safeEqual(expected, razorpaySignature);
}

// Webhooks are signed over the exact raw body, so the raw buffer must be kept.
function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !rawBody || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

async function createOrder({ amount, receipt, notes }) {
  return getClient().orders.create({
    amount: toPaise(amount),
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    notes: notes || undefined,
  });
}

async function fetchPayment(paymentId) {
  return getClient().payments.fetch(paymentId);
}

// Razorpay SDK errors are plain objects ({ statusCode, error }) with no
// message, so unwrap the nested fields into one readable string for staff.
function describeGatewayError(err) {
  if (!err) return 'Unknown Razorpay error';
  const inner = err.error && typeof err.error === 'object' ? err.error : null;
  const code = inner?.code || err.code || '';
  const description = inner?.description || err.description || err.message || '';
  const parts = [code, description].map(part => String(part).trim()).filter(Boolean);
  const detail = parts.join(': ') || String(err.statusCode ? `HTTP ${err.statusCode}` : '').trim();
  return detail || 'Unknown Razorpay error';
}

// `sdk` is injectable so the SDK-shape fallback can be tested without a network call.
async function refundPayment({ paymentId, amount, notes, sdk } = {}) {
  const client = sdk || getClient();
  // razorpay 2.9.x exposes `refunds` with only all/edit/fetch. Refunds are
  // actually created through `payments.refund`, which accepts the same body.
  // Prefer `refunds.create` so a future SDK that restores it keeps working.
  const create = client.refunds && typeof client.refunds.create === 'function'
    ? client.refunds.create.bind(client.refunds)
    : client.payments.refund.bind(client.payments);

  return create({
    payment_id: paymentId,
    ...(Number.isFinite(Number(amount)) ? { amount: toPaise(amount) } : {}),
    notes: notes || undefined,
  });
}

module.exports = {
  isConfigured,
  keyId,
  requireKeyId,
  toPaise,
  toRupees,
  safeEqual,
  describeGatewayError,
  verifyPaymentSignature,
  verifyWebhookSignature,
  createOrder,
  fetchPayment,
  refundPayment,
};
