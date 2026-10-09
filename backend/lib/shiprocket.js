// Shiprocket API client. Every Shiprocket HTTP call in this codebase goes
// through this module, mirroring how lib/razorpay.js owns all gateway access:
// lazy state, env read at call time, and 503 fail-closed when unconfigured.

// Shiprocket auth tokens are valid for 240 hours; refresh a minute early.
const TOKEN_TTL_MS = 240 * 60 * 60 * 1000;

function isConfigured() {
  return Boolean(process.env.SHIPROCKET_EMAIL?.trim() && process.env.SHIPROCKET_PASSWORD);
}

function baseUrl() {
  return String(process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in').replace(/\/+$/, '');
}

function pickupLocation() {
  return process.env.SHIPROCKET_PICKUP_LOCATION?.trim() || '';
}

function requireConfigured() {
  if (!isConfigured()) {
    throw Object.assign(new Error('Shipping (Shiprocket) is not configured yet.'), { status: 503 });
  }
}

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Per-request budget. Shiprocket normally answers in a few seconds, so 15s is
// generous for the sweep; callers on a serverless budget (Vercel kills at 10s)
// pass a shorter timeout explicitly.
function requestTimeoutMs() {
  return envNumber('SHIPROCKET_REQUEST_TIMEOUT_MS', 15000);
}

// Legacy products predate the package fields, so blanks fall back to these.
function packageDefaults() {
  return {
    weight: envNumber('SHIPROCKET_DEFAULT_WEIGHT', 0.5),
    length: envNumber('SHIPROCKET_DEFAULT_LENGTH', 25),
    breadth: envNumber('SHIPROCKET_DEFAULT_BREADTH', 20),
    height: envNumber('SHIPROCKET_DEFAULT_HEIGHT', 5),
  };
}

function flattenMessage(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(flattenMessage).filter(Boolean).join('; ');
  if (typeof value === 'object') return Object.values(value).map(flattenMessage).filter(Boolean).join('; ');
  return String(value).trim();
}

// Shiprocket answers with { message: '...' } or { message: { field: [...] } },
// so unwrap every shape into one readable line for staff and error logs.
function describeShiprocketError(err) {
  if (!err) return 'Unknown Shiprocket error';
  const detail = [
    err.code || '',
    flattenMessage(err.shiprocketMessage) || String(err.message || '').trim(),
  ].filter(Boolean).join(': ').trim();
  return detail || 'Unknown Shiprocket error';
}

// Our own problems (not configured, no pickup) keep their status; anything the
// upstream API rejects becomes 502 so callers show a retryable failure.
function httpError(status, body) {
  const detail = [flattenMessage(body?.message), flattenMessage(body?.errors || body?.error)].filter(Boolean).join(' ').trim();
  return Object.assign(new Error(detail || `Shiprocket request failed (HTTP ${status}).`), {
    status: status >= 400 ? 502 : status,
    upstream: status,
    shiprocketMessage: detail,
  });
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

let tokenCache = null; // { value, expiresAt }
let loginInFlight = null;
// A durable cross-instance session store (Firestore in production) so a
// serverless cold start reuses the account token instead of logging in again
// inside the payment request. Tokens live ~240h; callers share this session.
let tokenStore = null; // { read(), write({ token, expiresAt }) } | null

function setTokenStore(store) {
  tokenStore = store || null;
  // A different instance may have refreshed the session; re-read it once.
  tokenCache = null;
}

// Persists the Shiprocket session in Firestore so every Vercel serverless
// instance (each with its own memory) reuses the same login.
function createTokenStore(db) {
  const ref = db.collection("app_state").doc("shiprocket_session");
  const toMillis = raw => {
    if (raw && typeof raw.toMillis === "function") return raw.toMillis();
    if (typeof raw === "number") return raw;
    if (raw) {
      const time = new Date(raw).getTime();
      return Number.isFinite(time) ? time : 0;
    }
    return 0;
  };
  return {
    async read() {
      try {
        const snap = await ref.get();
        if (!snap.exists) return null;
        const data = snap.data() || {};
        if (!data.token) return null;
        const expiresAt = toMillis(data.expiresAt);
        if (!expiresAt) return null;
        return { token: String(data.token), expiresAt };
      } catch {
        // Firestore unavailable: fall back to a fresh login rather than fail.
        return null;
      }
    },
    async write({ token, expiresAt }) {
      await ref.set({ token, expiresAt: new Date(expiresAt), updatedAt: new Date() });
    },
  };
}

async function login(timeout) {
  requireConfigured();
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60 * 1000) return tokenCache.value;
  if (!loginInFlight) {
    loginInFlight = (async () => {
      // Reuse a session any instance persisted before burning a login round-trip.
      if (!tokenCache && tokenStore) {
        const session = await tokenStore.read();
        if (session && session.expiresAt > Date.now() + 60 * 1000) {
          tokenCache = { value: session.token, expiresAt: session.expiresAt };
          return tokenCache.value;
        }
      }
      const response = await fetch(`${baseUrl()}/v1/external/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.SHIPROCKET_EMAIL.trim(),
          password: process.env.SHIPROCKET_PASSWORD,
        }),
        signal: AbortSignal.timeout(timeout || requestTimeoutMs()),
      });
      const body = await readBody(response);
      if (!response.ok || !body?.token) throw httpError(response.status, body);
      tokenCache = { value: body.token, expiresAt: Date.now() + TOKEN_TTL_MS };
      if (tokenStore) {
        // Sharing the session is best-effort; a failed write just logs in again.
        try {
          await tokenStore.write({ token: tokenCache.value, expiresAt: tokenCache.expiresAt });
        } catch (err) {
          console.warn(`Could not persist Shiprocket session: ${err.message}`);
        }
      }
      return tokenCache.value;
    })().finally(() => {
      loginInFlight = null;
    });
  }
  return loginInFlight;
}

// Drops the cached token so the next call authenticates from scratch.
function resetToken() {
  tokenCache = null;
}

async function request(path, { method = 'GET', body, retryAuth = true, timeout } = {}) {
  requireConfigured();
  const token = await login(timeout);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeout || requestTimeoutMs()),
  });
  const data = await readBody(response);
  if (response.status === 401 && retryAuth) {
    // Token expired early or was revoked: refresh once, never loop.
    resetToken();
    return request(path, { method, body, retryAuth: false });
  }
  if (!response.ok) throw httpError(response.status, data);
  return data;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

// Accepts a Date, a Firestore-style Timestamp (has .toDate()), or anything
// Date-able; returns a real Date or null so callers can fall back.
function toDate(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Shiprocket wants 'YYYY-MM-DD HH:mm' local time.
function orderDate(date) {
  const d = toDate(date) || new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isDuplicateOrderError(err) {
  if (err?.upstream !== 409 && err?.upstream !== 422 && err?.upstream !== 400) return false;
  const detail = `${flattenMessage(err.shiprocketMessage)} ${err.message || ''}`.toLowerCase();
  return detail.includes('already') || detail.includes('taken') || detail.includes('exist') || detail.includes('duplicate');
}

// Shiprocket also demands the billing_* block even when shipping_is_billing,
// and the current API expects `payment_method` (Prepaid/COD), not `payment_mode`.
function splitName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

// Creates the order in Shiprocket (adhoc / quick order). `package` carries the
// weight (kg) and dimensions (cm) for the whole parcel. An explicit pickup
// (per-order choice made on the admin order page) wins over the env default.
async function createAdhocOrder({ orderId, placedAt, paymentMethod, customerEmail, subtotal, shippingAddress, items, package: parcel, pickupLocation: requestedPickup }, { timeout } = {}) {
  const pickup = String(requestedPickup || '').trim() || pickupLocation();
  if (!pickup) {
    throw Object.assign(new Error('SHIPROCKET_PICKUP_LOCATION is missing from the server configuration.'), { status: 503 });
  }
  const address = shippingAddress || {};
  const { firstName, lastName } = splitName(address.fullName);
  const payload = {
    order_id: String(orderId).slice(0, 50),
    order_date: orderDate(placedAt ? new Date(placedAt) : new Date()),
    pickup_location: pickup,
    payment_method: paymentMethod === 'cod' ? 'COD' : 'Prepaid',
    shipping_is_billing: true,
    delivery_customer_name: address.fullName || '',
    delivery_address: address.line1 || '',
    delivery_address_2: address.line2 || '',
    delivery_city: address.city || '',
    delivery_state: address.state || '',
    delivery_pincode: address.zip || '',
    delivery_country: address.country || 'India',
    delivery_phone: address.phone || '',
    delivery_email: customerEmail || '',
    billing_customer_name: firstName || address.fullName || '',
    billing_last_name: lastName,
    billing_address: address.line1 || '',
    billing_city: address.city || '',
    billing_state: address.state || '',
    billing_country: address.country || 'India',
    billing_phone: address.phone || '',
    billing_pincode: address.zip || '',
    billing_email: customerEmail || '',
    sub_total: Number(subtotal) || 0,
    weight: Number(parcel?.weight) || 0,
    length: Number(parcel?.length) || 0,
    breadth: Number(parcel?.breadth) || 0,
    height: Number(parcel?.height) || 0,
    order_items: (items || []).map(item => ({
      name: item.productName || 'Item',
      sku: item.productId,
      units: item.quantity,
      selling_price: Number(item.unitPrice) || 0,
    })),
  };
  const channel = process.env.SHIPROCKET_CHANNEL_ID?.trim();
  if (channel && Number.isFinite(Number(channel))) payload.channel_id = Number(channel);

  try {
    const data = await request('/v1/external/orders/create/adhoc', { method: 'POST', body: payload, timeout });
    return {
      duplicate: false,
      // The response's order_id is Shiprocket's own id; ours is order_id sent.
      srOrderId: data?.order_id ?? null,
      shipmentId: data?.shipment_id ?? null,
      raw: data,
    };
  } catch (err) {
    // A retry after a lost response can hit "order id already taken". The order
    // exists remotely, so adopt it instead of failing forever.
    if (isDuplicateOrderError(err)) return { duplicate: true, srOrderId: null, shipmentId: null, raw: null };
    throw err;
  }
}

function firstTracking(data) {
  if (Array.isArray(data)) return data[0]?.tracking_data || data[0] || null;
  if (!data || typeof data !== 'object') return null;
  if (data.tracking_data) return data.tracking_data;
  if (data.shipment_track || data.shipment_track_activities) return data;
  // track/awb and webhook payloads carry the labels at the top level.
  if (data.current_status || data.courier_name || typeof data.shipment_status === 'string') return data;
  return null;
}

// One normalizer for track-by-order-id, track-by-awb, and webhook payloads.
function normalizeTrackPayload(data) {
  const track = firstTracking(data);
  if (!track) return null;
  const shipment = (Array.isArray(track.shipment_track) ? track.shipment_track : [track.shipment_track]).filter(Boolean)[0] || {};
  const activities = (Array.isArray(track.shipment_track_activities) ? track.shipment_track_activities : [])
    .map(entry => ({
      date: entry?.date || '',
      activity: entry?.activity || '',
      location: entry?.location || '',
      status: entry?.status || entry?.['sr-status-label'] || '',
    }))
    .filter(entry => entry.activity || entry.date);
  const rawStatus = track.current_status || shipment.current_status || (typeof track.shipment_status === 'string' ? track.shipment_status : '');
  return {
    awb: String(shipment.awb_code || track.awb_code || track.awb || '').trim(),
    courierName: String(shipment.courier_name || track.courier_company || track.courier_name || '').trim(),
    status: String(rawStatus || '').trim(),
    statusCode: track.shipment_status ?? shipment.shipment_status ?? null,
    currentStatus: String(track.current_status || shipment.current_status || '').trim(),
    edd: String(track.etd || shipment.edd || '').trim(),
    trackUrl: String(track.track_url || '').trim(),
    activities,
  };
}

// Tracks by OUR order id (TGNR-...), which works even when the courier was
// assigned later from the Shiprocket panel.
async function trackByOrderId(orderId) {
  const data = await request(`/v1/external/courier/track?order_id=${encodeURIComponent(orderId)}`);
  return normalizeTrackPayload(data);
}

async function trackAwb(awb) {
  const data = await request(`/v1/external/courier/track/awb/${encodeURIComponent(awb)}`);
  return normalizeTrackPayload(data);
}

// Cancels an order in Shiprocket before dispatch (panel-side equivalent of our
// order cancellation). Shiprocket rejects orders already handed to a courier,
// which callers surface as a recorded, non-fatal error.
async function cancelAdhocOrders({ srOrderIds, reason = 'Order cancelled on the store.' } = {}) {
  const ids = (Array.isArray(srOrderIds) ? srOrderIds : [srOrderIds])
    .map(id => Number(id))
    .filter(id => Number.isFinite(id) && id > 0);
  if (!ids.length) {
    throw Object.assign(new Error('No Shiprocket order id is available to cancel.'), { status: 409 });
  }
  return request('/v1/external/orders/cancel', {
    method: 'POST',
    body: { ids, cancel_reason: String(reason).slice(0, 250) },
  });
}

// Every pickup address registered on the account (Settings -> Pickup Address).
// The admin order page lists these so staff can choose which warehouse ships an
// order. Falls back to the env default when the account has nothing registered.
async function listPickupLocations(timeout) {
  const data = await request('/v1/external/settings/company/pickup', { timeout });
  const entries = Array.isArray(data?.data?.shipping_address) ? data.data.shipping_address : [];
  const locations = entries
    .map(address => ({
      code: String(address?.pickup_location || '').trim(),
      name: String(address?.name || '').trim(),
      address: String(address?.address || '').trim(),
      address2: String(address?.address_2 || '').trim(),
      city: String(address?.city || '').trim(),
      state: String(address?.state || '').trim(),
      pinCode: String(address?.pin_code || '').trim(),
      country: String(address?.country || 'India').trim(),
    }))
    .filter(location => location.code);
  if (locations.length) return locations;
  const fallback = pickupLocation();
  return fallback ? [{ code: fallback, name: '', address: '', city: '', state: '', pinCode: '', country: 'India' }] : [];
}

// Moves an already-created Shiprocket order to a different pickup address
// (Settings -> Pickup Address) before it is dispatched. PATCH per Shiprocket's
// "Change/Update Pickup Location of Created Orders"; the AWB is preserved.
// `order_id` is a list of Shiprocket order ids (a bare id is rejected with 400).
async function updateOrderPickupLocation(srOrderId, pickupLocation, timeout) {
  const id = Number(srOrderId);
  const pickup = String(pickupLocation || '').trim();
  if (!Number.isFinite(id) || id <= 0) {
    throw Object.assign(new Error('No Shiprocket order id is available to update.'), { status: 409 });
  }
  if (!pickup) {
    throw Object.assign(new Error('A pickup location is required.'), { status: 400 });
  }
  return request('/v1/external/orders/address/pickup', {
    method: 'PATCH',
    body: { order_id: [id], pickup_location: pickup },
    timeout,
  });
}

module.exports = {
  isConfigured,
  pickupLocation,
  packageDefaults,
  login,
  resetToken,
  setTokenStore,
  createTokenStore,
  orderDate,
  describeShiprocketError,
  createAdhocOrder,
  listPickupLocations,
  updateOrderPickupLocation,
  trackByOrderId,
  trackAwb,
  cancelAdhocOrders,
  normalizeTrackPayload,
};
