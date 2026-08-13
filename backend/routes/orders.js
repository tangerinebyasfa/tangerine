const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/ordersController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// Authenticated user
router.post("/", verifyToken, ctrl.createOrder);
router.get("/mine", verifyToken, ctrl.getMyOrders);

// Admin only
router.get("/", verifyToken, requireAdmin, ctrl.getAllOrders);
router.put("/:id/status", verifyToken, requireAdmin, ctrl.updateOrderStatus);

module.exports = router;
