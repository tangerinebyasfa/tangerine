const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/blogsController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

// Public
router.get("/", ctrl.getBlogs);
router.get("/:idOrSlug", ctrl.getBlogById);

// Admin only
router.post("/", verifyToken, requireAdmin, ctrl.createBlog);
router.put("/:id", verifyToken, requireAdmin, ctrl.updateBlog);
router.delete("/:id", verifyToken, requireAdmin, ctrl.deleteBlog);

module.exports = router;
