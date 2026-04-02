const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware"); // ✅ destructured
const roleMiddleware = require("../middleware/roleMiddleware");
const visitController = require("../controllers/visitcontroller");

// ================= VISIT ROUTES =================

// Create Visit
router.post(
  "/",
  protect,
  roleMiddleware(["doctor", "hospital"]),
  visitController.createVisit
);

// Get All Visits
router.get(
  "/",
  protect,
  roleMiddleware(["doctor", "hospital"]),
  visitController.getAllVisits
);

// Get Single Visit
router.get(
  "/:id",
  protect,
  roleMiddleware(["doctor", "hospital"]),
  visitController.getSingleVisit
);

// Update Visit
router.put(
  "/:id",
  protect,
  roleMiddleware(["doctor", "hospital"]),
  visitController.updateVisit
);

// Delete Visit
router.delete(
  "/:id",
  protect,
  roleMiddleware(["doctor", "hospital"]),
  visitController.deleteVisit
);

module.exports = router;