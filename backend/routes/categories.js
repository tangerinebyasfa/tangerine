const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/categoriesController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// Public
router.get("/", ctrl.getCategories);
router.get("/:id", ctrl.getCategory);

// Admin only
router.post("/", verifyToken, requireAdmin, ctrl.createCategory);
router.put("/:id", verifyToken, requireAdmin, ctrl.updateCategory);
router.delete("/:id", verifyToken, requireAdmin, ctrl.deleteCategory);

module.exports = router;
