const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/productsController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// Public
router.get("/", ctrl.getProducts);
router.get("/:id", ctrl.getProductById);

// Admin only
router.post("/", verifyToken, requireAdmin, ctrl.createProduct);
router.put("/:id", verifyToken, requireAdmin, ctrl.updateProduct);
router.delete("/:id", verifyToken, requireAdmin, ctrl.deleteProduct);

module.exports = router;
