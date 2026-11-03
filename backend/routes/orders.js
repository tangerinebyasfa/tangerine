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
router.post("/", verifyToken, ctrl.createOrder);
router.get("/mine", verifyToken, ctrl.getMyOrders);
router.get("/:id", verifyToken, ctrl.getOrderById);

// Admin only
router.get("/", verifyToken, requireAdmin, ctrl.getAllOrders);
router.put("/:id/status", verifyToken, requireAdmin, ctrl.updateOrderStatus);
router.delete("/:id", verifyToken, requireAdmin, ctrl.deleteOrder);

module.exports = router;
