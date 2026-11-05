const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/couponsController");
const { verifyToken, requireAdmin } = require("../middleware/auth");
const { couponLimiter } = require("../middleware/rateLimit");

router.get("/valid", ctrl.getPublicCoupons);
router.post("/validate", couponLimiter, verifyToken, ctrl.validateCoupon);
router.get("/", verifyToken, requireAdmin, ctrl.getCoupons);
router.post("/", verifyToken, requireAdmin, ctrl.createCoupon);
router.put("/:id", verifyToken, requireAdmin, ctrl.updateCoupon);
router.delete("/:id", verifyToken, requireAdmin, ctrl.deleteCoupon);

module.exports = router;
