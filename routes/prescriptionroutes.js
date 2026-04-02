const express = require("express");
const router = express.Router();

// Middlewares
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Controller
const prescriptionController = require("../controllers/prescriptioncontroller");

/* =====================================================
   PRESCRIPTION ROUTES
   Base URL: /api/prescriptions
===================================================== */

// ✅ Create Prescription
router.post(
  "/",
  protect,
  roleMiddleware(["doctor"]), // only doctor can create prescriptions
  prescriptionController.createPrescription
);

// ✅ Get All Prescriptions (optional filter by visit_id)
router.get(
  "/",
  protect,
  roleMiddleware(["doctor", "hospital", "patient"]),
  prescriptionController.getAllPrescriptions
);

// ✅ Get Single Prescription
router.get(
  "/:id",
  protect,
  roleMiddleware(["doctor", "hospital", "patient"]),
  prescriptionController.getSinglePrescription
);

// ✅ Update Prescription
router.put(
  "/:id",
  protect,
  roleMiddleware(["doctor"]),
  prescriptionController.updatePrescription
);

// ✅ Delete Prescription
router.delete(
  "/:id",
  protect,
  roleMiddleware(["doctor"]),
  prescriptionController.deletePrescription
);

module.exports = router;