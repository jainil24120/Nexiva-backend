const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const aiController = require("../controllers/aicontroller");

router.post(
  "/emergency-analysis",
  protect,
  roleMiddleware(["doctor"]),
  aiController.getEmergencyAnalysis
);

module.exports = router;
