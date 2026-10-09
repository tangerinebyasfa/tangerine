const express = require("express");
const router = express.Router();
const returns = require("../controllers/returnsController");
const ctrl = require("../controllers/ordersController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// Authenticated user
router.get("/:id/returns", verifyToken, returns.listForOrder);
router.post("/:id/returns", verifyToken, returns.create);
router.get("/attempt/:requestId", verifyToken, ctrl.recoverOrder);
router.post("/quote", verifyToken, ctrl.quoteOrder);
router.put("/:id/cancel", verifyToken, ctrl.cancelOrder);
router.post("/:id/verify-payment", verifyToken, ctrl.verifyPayment);
router.post("/:id/tracking/refresh", verifyToken, ctrl.refreshOrderTracking);
router.post("/:id/release", verifyToken, ctrl.releaseUnpaidOrder);
router.post("/", verifyToken, ctrl.createOrder);
router.get("/mine", verifyToken, ctrl.getMyOrders);
// Static segment must be registered before the ":id" param route so it is not
// swallowed as an order id.
router.get("/pickup-options", verifyToken, requireAdmin, ctrl.getPickupOptions);
router.get("/:id", verifyToken, ctrl.getOrderById);

// Admin only
router.get("/", verifyToken, requireAdmin, ctrl.getAllOrders);
router.put("/:id/status", verifyToken, requireAdmin, ctrl.updateOrderStatus);
router.put("/:id/pickup", verifyToken, requireAdmin, ctrl.updateOrderPickup);
router.delete("/:id", verifyToken, requireAdmin, ctrl.deleteOrder);

module.exports = router;
