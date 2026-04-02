const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware"); // destructured
const roleMiddleware = require("../middleware/roleMiddleware");
const fileController = require("../controllers/filecontroller");

/* =====================================================
   FILE ROUTES
===================================================== */

// ✅ Create File
router.post(
  "/",
  protect,
  roleMiddleware(["hospital"]),
  fileController.createFile
);

// ✅ Get all files (hospital view)
router.get(
  "/hospital",
  protect,
  roleMiddleware(["hospital"]),
  fileController.getAllFilesByHospital
);

// ✅ Get files for a patient
router.get(
  "/patient/:patientId",
  protect,
  roleMiddleware(["hospital","patient"]),
  fileController.getPatientFiles
);

// ✅ Update file status
router.patch(
  "/:id/status",
  protect,
  roleMiddleware(["hospital"]),
  fileController.updateFileStatus
);

module.exports = router;