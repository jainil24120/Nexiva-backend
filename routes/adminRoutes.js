const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const adminController = require("../controllers/admincontroller");

router.get("/stats", protect, roleMiddleware("admin"), adminController.getStats);
router.get("/doctors", protect, roleMiddleware("admin"), adminController.getAllDoctors);
router.get("/patients", protect, roleMiddleware("admin"), adminController.getAllPatients);
router.get("/revenue", protect, roleMiddleware("admin"), adminController.getRevenue);

module.exports = router;
