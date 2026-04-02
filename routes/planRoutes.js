const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const planController = require("../controllers/plancontroller");

// Public — hospitals/doctors can see available plans
router.get("/", protect, planController.getAllPlans);

// Admin only
router.post("/", protect, roleMiddleware("admin"), planController.createPlan);
router.put("/:id", protect, roleMiddleware("admin"), planController.updatePlan);
router.delete("/:id", protect, roleMiddleware("admin"), planController.deletePlan);

module.exports = router;
