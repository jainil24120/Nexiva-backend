const express = require("express");
const router = express.Router();
const authController = require("../controllers/authcontroller");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../utils/fileUpload");

// Public routes
router.post("/register", upload.single("verificationDocument"), authController.register);
router.post("/login", authController.login);
router.post("/admin/login", authController.adminLogin);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-otp", authController.verifyOtp);
router.post("/reset-password", authController.resetPassword);
router.post("/check-userid", authController.checkUserId);

// Protected routes
router.get("/me", protect, authController.getMe);
router.put("/change-password", protect, authController.changePassword);

module.exports = router;
