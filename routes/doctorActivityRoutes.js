const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/doctorActivityController");

// Doctor toggles active/inactive
router.post("/go-active", protect, roleMiddleware(["doctor"]), ctrl.goActive);
router.post("/go-inactive", protect, roleMiddleware(["doctor"]), ctrl.goInactive);

// Hospital views calendar and active doctors
router.get("/calendar", protect, roleMiddleware(["hospital", "admin"]), ctrl.getCalendar);
router.get("/active-now", protect, roleMiddleware(["hospital", "admin", "doctor"]), ctrl.getActiveDoctors);

module.exports = router;
