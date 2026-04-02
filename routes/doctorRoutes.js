const express = require("express");
const router = express.Router();

const doctorController = require("../controllers/doctorcontroller");
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ==============================
// 🔓 Public Routes
// ==============================

// Register a new doctor
router.post("/register", doctorController.registerDoctor);

// Doctor login
router.post("/login", doctorController.loginDoctor);

// ==============================
// 🔒 Protected Routes (JWT Required)
// ==============================

// Get own profile
router.get("/profile", protect, doctorController.getDoctorProfile);

// Update own profile
router.patch("/profile", protect, doctorController.updateDoctorProfile);

// ==============================
// 🏥 Hospital/Admin Routes
// ==============================

// Get all doctors
router.get(
  "/",
  protect,
  roleMiddleware(["admin", "hospital"]),
  doctorController.getAllDoctors
);

// Delete doctor (admin, hospital, or doctor self-delete)
router.delete(
  "/:id",
  protect,
  roleMiddleware(["admin", "hospital", "doctor"]),
  doctorController.deleteDoctor
);

module.exports = router;