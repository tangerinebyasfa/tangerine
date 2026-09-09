const { db, admin } = require("../config/firebaseAdmin");

const couponsRef = db.collection("coupons");
const ordersRef = db.collection("orders");
const cod = require("../lib/cod");

function text(value) {
  return String(value ?? "").trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function list(value) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  return text(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function dateValue(value) {
  if (!value) return null;
  const date = value?.toDate?.() || new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serialize(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return value;
}

function mapCoupon(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ...data,
    expiresAt: serialize(data.expiresAt),
    createdAt: serialize(data.createdAt),
    updatedAt: serialize(data.updatedAt),
  };
}

function normalizeCoupon(payload = {}, current = {}) {
  const code = text(payload.code || current.code).toUpperCase();
  const discountType = text(payload.discountType || current.discountType).toLowerCase();
  const discountValue = number(payload.discountValue ?? current.discountValue);
  const minimumOrderValue = Number(payload.minimumOrderValue ?? current.minimumOrderValue ?? 0);
  if (!Number.isFinite(minimumOrderValue) || minimumOrderValue < 0) throw new Error("Invalid minimum order value.");
  const expiresAt = dateValue(payload.expiresAt ?? current.expiresAt);
  const scope = text(payload.scope || current.scope || "storewide").toLowerCase();
  const productIds = list(payload.productIds ?? current.productIds);
  const categorySlugs = list(payload.categorySlugs ?? current.categorySlugs);
  const usageLimitValue = payload.usageLimit === undefined ? current.usageLimit : payload.usageLimit;
  const perUserLimitValue = payload.perUserLimit === undefined ? current.perUserLimit : payload.perUserLimit;

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new Error("Coupon code must be 3-40 letters, numbers, hyphens, or underscores.");
  if (!["percentage", "fixed"].includes(discountType)) throw new Error("Discount type must be percentage or fixed.");
  if (discountValue <= 0 || (discountType === "percentage" && discountValue > 100)) throw new Error("Enter a valid discount value.");
  if (!expiresAt) throw new Error("A valid expiry date is required.");
  if (!["storewide", "products", "categories"].includes(scope)) throw new Error("Invalid coupon scope.");
  if (scope === "products" && !productIds.length) throw new Error("Select at least one product for this coupon.");
  if (scope === "categories" && !categorySlugs.length) throw new Error("Select at least one category for this coupon.");

  for (const value of [usageLimitValue, perUserLimitValue]) {
    if (value !== "" && value != null && (!Number.isSafeInteger(Number(value)) || Number(value) < 0)) throw new Error("Usage limits must be non-negative whole numbers.");
  }
  if (payload.active !== undefined && typeof payload.active !== "boolean") throw new Error("Active must be a boolean.");
  const usageLimit = usageLimitValue === "" || usageLimitValue === null || usageLimitValue === undefined ? null : Math.max(0, Math.floor(number(usageLimitValue)));
  const perUserLimit = perUserLimitValue === "" || perUserLimitValue === null || perUserLimitValue === undefined ? null : Math.max(0, Math.floor(number(perUserLimitValue)));

  return {
    code,
    discountType,
    discountValue,
    minimumOrderValue,
    expiresAt,
    usageLimit,
    perUserLimit,
    scope,
    productIds,
    categorySlugs,
    active: payload.active === undefined ? current.active !== false : Boolean(payload.active),
  };
}

function couponAppliesToProduct(coupon, product) {
  if (coupon.scope === "storewide") return true;
  if (coupon.scope === "products") return (coupon.productIds || []).includes(product.id);
  return coupon.scope === "categories" && (coupon.categorySlugs || []).includes(text(product.categorySlug || product.subType));
}

function getEligibleSubtotal(coupon, items, productMap) {
  return items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    return product && couponAppliesToProduct(coupon, { id: item.productId, ...product })
      ? sum + cod.price(product) * item.quantity
      : sum;
  }, 0);
}

function calculateDiscount(coupon, eligibleSubtotal) {
  const raw = coupon.discountType === "percentage"
    ? eligibleSubtotal * coupon.discountValue / 100
    : coupon.discountValue;
  return Math.max(0, Math.min(eligibleSubtotal, Math.round(raw * 100) / 100));
}

async function findCoupon(code) {
  const snapshot = await couponsRef.where("code", "==", text(code).toUpperCase()).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0];
}

async function validateCouponForOrder({ code, userId, items, productMap, subtotal, transaction }) {
  const couponDoc = arguments[0].couponDocument || await findCoupon(code);
  if (!couponDoc) throw Object.assign(new Error("Coupon not found."), { status: 400 });

  if (!userId) cod.fail("Please sign in to use a coupon.", 401);
  const coupon = couponDoc.data() || {};
  if (!["percentage", "fixed"].includes(coupon.discountType) || typeof coupon.discountValue !== "number" || !Number.isFinite(coupon.discountValue) || coupon.discountValue <= 0 || (coupon.discountType === "percentage" && coupon.discountValue > 100)) cod.fail("Invalid coupon configuration.", 409);
  const now = new Date();
  const expiresAt = dateValue(coupon.expiresAt);
  if (coupon.active !== true) throw Object.assign(new Error("This coupon is inactive."), { status: 400 });
  if (!expiresAt || expiresAt <= now) throw Object.assign(new Error("This coupon has expired."), { status: 400 });
  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && number(coupon.usedCount) >= number(coupon.usageLimit)) {
    throw Object.assign(new Error("This coupon has reached its usage limit."), { status: 400 });
  }
  if (number(subtotal) < number(coupon.minimumOrderValue)) throw Object.assign(new Error(`Minimum order value is ${coupon.minimumOrderValue}.`), { status: 400 });

  const eligibleSubtotal = getEligibleSubtotal(coupon, items, productMap);
  if (eligibleSubtotal <= 0) throw Object.assign(new Error("This coupon does not apply to the products in your order."), { status: 400 });

  if (coupon.perUserLimit !== null && coupon.perUserLimit !== undefined) {
    const ordersQuery = ordersQueryForUser(userId, couponDoc.id, coupon.code);
    const previousOrderSnapshot = transaction
      ? await transaction.get(ordersQuery)
      : await ordersQuery.get();
    const previousOrders = previousOrderSnapshot.docs.filter((doc) => {
      const data = doc.data() || {};
      return data.couponId === couponDoc.id || text(data.couponCode || data.discountCode).toUpperCase() === text(coupon.code).toUpperCase();
    });
    if (previousOrders.length >= number(coupon.perUserLimit)) {
      throw Object.assign(new Error("You have reached this coupon's per-user limit."), { status: 400 });
    }
  }

  return {
    id: couponDoc.id,
    code: text(coupon.code).toUpperCase(),
    discountType: text(coupon.discountType).toLowerCase(),
    discountValue: number(coupon.discountValue),
    discountAmount: calculateDiscount(coupon, eligibleSubtotal),
    eligibleSubtotal,
  };
}

function ordersQueryForUser(userId, couponId, couponCode) {
  return ordersRef.where("userId", "==", userId);
}

exports.getCoupons = async (req, res) => {
  try {
    const snapshot = await couponsRef.orderBy("createdAt", "desc").get();
    res.json(snapshot.docs.map(mapCoupon));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
};

exports.getPublicCoupons = async (req, res) => {
  try {
    const productId = text(req.query.productId);
    const productSnapshot = productId ? await db.collection("products").doc(productId).get() : null;
    if (!productSnapshot?.exists) return res.json([]);
    const product = { ...productSnapshot.data(), id: productId };
    const snapshot = await couponsRef.where("active", "==", true).get();
    const now = new Date();
    const coupons = snapshot.docs.map(mapCoupon).filter((coupon) => {
      const expiresAt = dateValue(coupon.expiresAt);
      if (!expiresAt || expiresAt <= now) return false;
      if (coupon.usageLimit != null && number(coupon.usedCount) >= number(coupon.usageLimit)) return false;
      if (coupon.perUserLimit === 0) return false;
      return couponAppliesToProduct(coupon, product);
    });
    res.json(coupons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch valid coupons" });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const items = cod.normalizeItems(req.body?.items);
    const productIds = [...new Set(items.map((item) => text(item.productId)).filter(Boolean))];
    const productSnapshots = await Promise.all(productIds.map((id) => db.collection("products").doc(id).get()));
    const productMap = new Map(productSnapshots.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data()]));
    const { lines } = cod.catalogItems(items, productMap);
    const actualSubtotal = cod.money(lines.reduce((sum, item) => sum + item.lineTotal, 0));
    const result = await validateCouponForOrder({ code: req.body?.code, userId: req.user.uid, items, productMap, subtotal: actualSubtotal });
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Invalid coupon" });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const payload = normalizeCoupon(req.body);
    const now = admin.firestore.Timestamp.now();
    const ref = couponsRef.doc();
    await db.runTransaction(async tx => {
      const lock = db.collection("couponCodes").doc(payload.code);
      const reserved = await tx.get(lock);
      const existing = await tx.get(couponsRef.where("code", "==", payload.code).limit(1));
      if (reserved.exists || !existing.empty) cod.fail("Coupon code already exists or was previously used.", 409);
      tx.set(lock, { couponId: ref.id });
      tx.set(ref, { ...payload, usedCount: 0, createdAt: now, updatedAt: now });
    });
    res.status(201).json(mapCoupon(await ref.get()));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Failed to create coupon" });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const ref = couponsRef.doc(req.params.id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) cod.fail("Coupon not found.", 404);
      const payload = normalizeCoupon(req.body, snap.data());
      const lock = db.collection("couponCodes").doc(payload.code);
      const reserved = await tx.get(lock);
      const duplicate = await tx.get(couponsRef.where("code", "==", payload.code).limit(2));
      if ((reserved.exists && reserved.data().couponId !== ref.id) || duplicate.docs.some(doc => doc.id !== ref.id)) cod.fail("Coupon code already exists or was previously used.", 409);
      // Keep previous code reservations so deleted/renamed promotions cannot reset eligibility.
      tx.set(db.collection("couponCodes").doc(snap.data().code), { couponId: ref.id });
      tx.set(lock, { couponId: ref.id });
      tx.update(ref, { ...payload, updatedAt: admin.firestore.Timestamp.now() });
    });
    res.json(mapCoupon(await ref.get()));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Failed to update coupon" });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const ref = couponsRef.doc(req.params.id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) cod.fail("Coupon not found.", 404);
      tx.set(db.collection("couponCodes").doc(snap.data().code), { couponId: ref.id });
      tx.delete(ref);
    });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete coupon" });
  }
};

exports.validateCouponForOrder = validateCouponForOrder;
exports.couponsRef = couponsRef;
