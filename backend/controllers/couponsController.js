const { db, admin } = require("../config/firebaseAdmin");

const couponsRef = db.collection("coupons");

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
  const minimumOrderValue = Math.max(0, number(payload.minimumOrderValue ?? current.minimumOrderValue));
  const expiresAt = dateValue(payload.expiresAt ?? current.expiresAt);
  const scope = text(payload.scope || current.scope || "storewide").toLowerCase();
  const productIds = list(payload.productIds ?? current.productIds);
  const categorySlugs = list(payload.categorySlugs ?? current.categorySlugs);
  const usageLimitValue = payload.usageLimit ?? current.usageLimit;
  const perUserLimitValue = payload.perUserLimit ?? current.perUserLimit;

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new Error("Coupon code must be 3-40 letters, numbers, hyphens, or underscores.");
  if (!["percentage", "fixed"].includes(discountType)) throw new Error("Discount type must be percentage or fixed.");
  if (discountValue <= 0 || (discountType === "percentage" && discountValue > 100)) throw new Error("Enter a valid discount value.");
  if (!expiresAt) throw new Error("A valid expiry date is required.");
  if (!["storewide", "products", "categories"].includes(scope)) throw new Error("Invalid coupon scope.");
  if (scope === "products" && !productIds.length) throw new Error("Select at least one product for this coupon.");
  if (scope === "categories" && !categorySlugs.length) throw new Error("Select at least one category for this coupon.");

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
  if (coupon.scope === "products") return coupon.productIds.includes(product.id);
  return coupon.categorySlugs.includes(text(product.categorySlug || product.subType));
}

function getEligibleSubtotal(coupon, items, productMap) {
  return items.reduce((sum, item) => {
    const product = productMap.get(item.productId);
    return product && couponAppliesToProduct(coupon, { id: item.productId, ...product })
      ? sum + number(product.price) * Number(item.quantity || 1)
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

  const coupon = couponDoc.data() || {};
  const now = new Date();
  const expiresAt = dateValue(coupon.expiresAt);
  if (coupon.active === false) throw Object.assign(new Error("This coupon is inactive."), { status: 400 });
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
    const categorySlug = text(req.query.categorySlug);
    const snapshot = await couponsRef.where("active", "==", true).get();
    const now = new Date();
    const coupons = snapshot.docs.map(mapCoupon).filter((coupon) => {
      const expiresAt = dateValue(coupon.expiresAt);
      if (!expiresAt || expiresAt <= now) return false;
      if (coupon.scope === "products") return productId && coupon.productIds.includes(productId);
      if (coupon.scope === "categories") return categorySlug && coupon.categorySlugs.includes(categorySlug);
      return true;
    });
    res.json(coupons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch valid coupons" });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const { items = [], subtotal = 0 } = req.body || {};
    const productIds = [...new Set(items.map((item) => text(item.productId)).filter(Boolean))];
    const productSnapshots = await Promise.all(productIds.map((id) => db.collection("products").doc(id).get()));
    const productMap = new Map(productSnapshots.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data()]));
    const actualSubtotal = items.reduce((sum, item) => sum + number(productMap.get(item.productId)?.price) * Number(item.quantity || 1), 0);
    const result = await validateCouponForOrder({ code: req.body?.code, userId: req.user.uid, items, productMap, subtotal: actualSubtotal });
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Invalid coupon" });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const payload = normalizeCoupon(req.body);
    const existing = await findCoupon(payload.code);
    if (existing) return res.status(409).json({ error: "Coupon code already exists." });
    const now = admin.firestore.Timestamp.now();
    const ref = couponsRef.doc();
    await ref.set({ ...payload, usedCount: 0, createdAt: now, updatedAt: now });
    res.status(201).json(mapCoupon(await ref.get()));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Failed to create coupon" });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const ref = couponsRef.doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Coupon not found." });
    const payload = normalizeCoupon(req.body, snap.data());
    const duplicate = await findCoupon(payload.code);
    if (duplicate && duplicate.id !== ref.id) return res.status(409).json({ error: "Coupon code already exists." });
    await ref.update({ ...payload, updatedAt: admin.firestore.Timestamp.now() });
    res.json(mapCoupon(await ref.get()));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Failed to update coupon" });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    await couponsRef.doc(req.params.id).delete();
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete coupon" });
  }
};

exports.validateCouponForOrder = validateCouponForOrder;
exports.couponsRef = couponsRef;
