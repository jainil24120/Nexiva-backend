const express = require("express");
const router = express.Router();

// Middlewares
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Controller
const patientController = require("../controllers/patientcontroller");

// Create Patient Profile
router.post(
  "/",
  protect,
  roleMiddleware("patient"),
  patientController.createPatientProfile
);

// Get Logged-in Patient Profile
router.get(
  "/me",
  protect,
  roleMiddleware("patient"),
  patientController.getPatientProfile
);

// Update Patient Profile
router.put(
  "/me",
  protect,
  roleMiddleware("patient"),
  patientController.updatePatientProfile
);

// Toggle Emergency Mode
router.patch(
  "/emergency",
  protect,
  roleMiddleware("patient"),
  patientController.toggleEmergencyStatus
);

// Doctor Emergency Access
router.patch(
  "/:patientId/emergency-access",
  protect,
  roleMiddleware("doctor"),
  patientController.getEmergencyPatientData
);

module.exports = router;
