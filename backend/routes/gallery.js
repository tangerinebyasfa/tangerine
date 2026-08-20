const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/galleryController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// Public
router.get("/", ctrl.getGalleryItems);

// Admin only
router.post("/", verifyToken, requireAdmin, ctrl.createGalleryItem);
router.put("/:id", verifyToken, requireAdmin, ctrl.updateGalleryItem);
router.delete("/:id", verifyToken, requireAdmin, ctrl.deleteGalleryItem);

module.exports = router;
