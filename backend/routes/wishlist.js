const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/wishlistController");
const { verifyToken } = require("../middleware/auth");

router.get("/", verifyToken, ctrl.getWishlist);
router.post("/:productId", verifyToken, ctrl.addWishlistItem);
router.delete("/:productId", verifyToken, ctrl.removeWishlistItem);

module.exports = router;
