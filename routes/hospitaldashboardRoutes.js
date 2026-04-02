const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const hospitalDashboardController = require("../controllers/hospitaldashboardcontroller");

router.get(
  "/",
  protect,
  roleMiddleware("hospital"),
  hospitalDashboardController.getMyDashboard
);

module.exports = router;
