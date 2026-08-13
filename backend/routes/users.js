const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/usersController");
const { verifyToken, requireAdmin } = require("../middleware/auth");

router.post("/sync", verifyToken, ctrl.syncUser);
router.get("/me", verifyToken, ctrl.getMe);
router.put("/me", verifyToken, ctrl.updateMe);

// Admin only
router.get("/", verifyToken, requireAdmin, ctrl.getAllUsers);
router.put("/:id/role", verifyToken, requireAdmin, ctrl.updateUserRole);

module.exports = router;
