const express = require("express");
const router = express.Router();

const hospitalCtrl = require("../controllers/hospitalcontroller");
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ================= AUTH =================
router.post("/register", hospitalCtrl.registerHospital);
router.post("/login", hospitalCtrl.loginHospital);
router.post("/forgot-password", hospitalCtrl.forgotPassword);
router.post("/reset-password/:token", hospitalCtrl.resetPassword);

// ================= HOSPITAL PROFILE =================
router.get("/me", protect, roleMiddleware(["hospital"]), hospitalCtrl.getHospitalProfile);
router.patch("/me", protect, roleMiddleware(["hospital"]), hospitalCtrl.updateHospitalProfile);
router.patch("/me/change-password", protect, roleMiddleware(["hospital"]), hospitalCtrl.changePassword);

// ================= DOCTOR MANAGEMENT =================
router.post("/doctors", protect, roleMiddleware(["hospital"]), hospitalCtrl.addDoctor);
router.get("/doctors", protect, roleMiddleware(["hospital"]), hospitalCtrl.getHospitalDoctors);
router.patch("/doctors/:doctorId", protect, roleMiddleware(["hospital"]), hospitalCtrl.updateDoctor);
router.delete("/doctors/:doctorId", protect, roleMiddleware(["hospital"]), hospitalCtrl.removeDoctor);
router.patch("/doctors/:doctorId/access", protect, roleMiddleware(["hospital"]), hospitalCtrl.updateDoctorAccess);

// ================= PATIENT MANAGEMENT =================
router.get("/patients", protect, roleMiddleware(["hospital"]), hospitalCtrl.getHospitalPatients);
router.post("/patients/create", protect, roleMiddleware(["hospital"]), hospitalCtrl.createPatientWithFile);
router.post("/patients/check-aadhaar", protect, roleMiddleware(["hospital"]), hospitalCtrl.checkAadhaar);

// ================= EMERGENCY LOGS =================
router.get("/emergency-logs", protect, roleMiddleware(["hospital"]), hospitalCtrl.getEmergencyLogs);

// ================= AI USAGE LOGS =================
router.get("/ai-logs/:hospitalId", protect, roleMiddleware(["hospital", "doctor"]), hospitalCtrl.getAIUsageLogs);

// ================= SUBSCRIPTION & BILLING =================
router.get("/subscription", protect, roleMiddleware(["hospital"]), hospitalCtrl.getSubscriptionDetails);
router.get("/billing-history", protect, roleMiddleware(["hospital"]), hospitalCtrl.getBillingHistory);

// ================= SETTINGS =================
router.get("/settings", protect, roleMiddleware(["hospital"]), hospitalCtrl.getHospitalSettings);
router.patch("/settings", protect, roleMiddleware(["hospital"]), hospitalCtrl.updateHospitalSettings);

// ================= ADMIN CONTROLS =================
router.get("/all", protect, roleMiddleware(["admin"]), hospitalCtrl.getAllHospitals);
router.patch("/:hospitalId/verify", protect, roleMiddleware(["admin"]), hospitalCtrl.updateVerificationStatus);
router.patch("/:hospitalId/status", protect, roleMiddleware(["admin"]), hospitalCtrl.updateHospitalStatus);

module.exports = router;