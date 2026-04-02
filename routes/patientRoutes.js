const express = require("express");
const router = express.Router();

const patientController = require("../controllers/patientcontroller");
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ================= EMERGENCY LOOKUP (must be before /:patientId) =================
router.get("/emergency-lookup", protect, roleMiddleware(["doctor"]), patientController.emergencyLookup);

// ================= PATIENT PROFILE =================

// Create profile
router.post(
  "/profile",
  protect,
  roleMiddleware("patient"),
  patientController.createPatientProfile
);

// Get own profile
router.get(
  "/profile",
  protect,
  roleMiddleware("patient"),
  patientController.getPatientProfile
);

// Update profile
router.patch(
  "/profile",
  protect,
  roleMiddleware("patient"),
  patientController.updatePatientProfile
);

// ================= PATIENT ALLERGIES =================

router.get("/allergies", protect, roleMiddleware("patient"), patientController.getMyAllergies);
router.post("/allergies", protect, roleMiddleware("patient"), patientController.addAllergy);
router.put("/allergies/:allergyId", protect, roleMiddleware("patient"), patientController.updateAllergy);
router.delete("/allergies/:allergyId", protect, roleMiddleware("patient"), patientController.deleteAllergy);

// ================= PATIENT MY-DATA =================

router.get("/my-hospitals", protect, roleMiddleware("patient"), patientController.getMyHospitals);
router.get("/my-visits", protect, roleMiddleware("patient"), patientController.getMyVisits);
router.get("/my-reports", protect, roleMiddleware("patient"), patientController.getMyReports);

// ================= HOSPITAL =================

// Get all patients
router.get(
  "/",
  protect,
  roleMiddleware("hospital"),
  patientController.getAllPatients
);

// Search patient
router.get(
  "/search",
  protect,
  roleMiddleware("hospital"),
  patientController.searchPatient
);

// Toggle emergency status
router.patch(
  "/:patientId/emergency-toggle",
  protect,
  roleMiddleware(["hospital"]),
  patientController.toggleEmergencyStatus
);

// ================= DOCTOR / HOSPITAL =================

// Get patient by id
router.get(
  "/:patientId",
  protect,
  roleMiddleware("doctor", "hospital"),
  patientController.getPatientById
);

// Get patient visits
router.get(
  "/:patientId/visits",
  protect,
  roleMiddleware("doctor", "hospital"),
  patientController.getPatientVisits
);

// Get patient reports
router.get(
  "/:patientId/reports",
  protect,
  roleMiddleware("doctor", "hospital"),
  patientController.getPatientReports
);

// ================= DOCTOR =================

// Upload report
router.post(
  "/:patientId/report",
  protect,
  roleMiddleware("doctor"),
  patientController.uploadPatientReport
);

// Emergency data access
router.get(
  "/:patientId/emergency",
  protect,
  roleMiddleware("doctor"),
  patientController.getEmergencyPatientData
);

module.exports = router;