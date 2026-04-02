const express = require("express");
const router = express.Router();

const doctorHospitalCtrl = require("../controllers/doctorhospitalcontroller");
const { protect } = require("../middleware/authMiddleware"); // fixed
const roleMiddleware = require("../middleware/roleMiddleware");

// =======================================
// 🏥 ADMIN ROUTES (Assign / Remove)
// =======================================

// ✅ Assign Doctor to Hospital
router.post(
  "/assign",
  protect,
  roleMiddleware(["admin"]),
  doctorHospitalCtrl.assignDoctorToHospital
);

// ✅ Update Mapping Status (active / inactive)
router.put(
  "/status",
  protect,
  roleMiddleware(["admin"]),
  doctorHospitalCtrl.updateDoctorHospitalStatus
);

// ✅ Remove Doctor from Hospital (optional hard remove)
router.delete(
  "/remove",
  protect,
  roleMiddleware(["admin"]),
  doctorHospitalCtrl.removeDoctorFromHospital
);

// =======================================
// 👨‍⚕️ DOCTOR ROUTES
// =======================================

// ✅ Get all hospitals where doctor is mapped
router.get(
  "/my-hospitals",
  protect,
  roleMiddleware(["doctor"]),
  doctorHospitalCtrl.getMyHospitals
);

// =======================================
// 🏥 HOSPITAL ROUTES
// =======================================

// ✅ Get all doctors of a hospital
router.get(
  "/hospital/:hospitalId",
  protect,
  roleMiddleware(["admin", "hospital"]),
  doctorHospitalCtrl.getDoctorsByHospital
);

module.exports = router;