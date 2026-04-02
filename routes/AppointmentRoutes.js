const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware"); // correct import
const roleMiddleware = require("../middleware/roleMiddleware");
const appointmentCtrl = require("../controllers/Appointmentcontroller");

// ================= PATIENT =================

// Patient books appointment
router.post(
  "/book",
  protect,
  roleMiddleware(["patient"]),
  appointmentCtrl.bookAppointment
);

// Patient view own appointments
router.get(
  "/my-appointments",
  protect,
  roleMiddleware(["patient"]),
  appointmentCtrl.getMyAppointments
);

// ================= HOSPITAL =================

// Hospital view all appointments of their hospital
router.get(
  "/hospital",
  protect,
  roleMiddleware(["hospital"]),
  appointmentCtrl.getHospitalAppointments
);

// Hospital or Doctor update status (Approve / Reject / Complete)
router.put(
  "/status/:id",
  protect,
  roleMiddleware(["hospital", "doctor"]),
  appointmentCtrl.updateAppointmentStatus
);

// ================= DOCTOR =================

router.get(
  "/doctor",
  protect,
  roleMiddleware(["doctor"]),
  appointmentCtrl.getDoctorAppointments
);

module.exports = router;