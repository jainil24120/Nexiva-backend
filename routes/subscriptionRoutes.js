const express = require("express");
const router = express.Router();

const subscriptionController = require("../controllers/subscriptioncontroller");
const { protect } = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Check if a hospital has active subscription (for doctors checking emergency access)
router.get(
  "/check/:hospitalId",
  protect,
  subscriptionController.checkHospitalSubscription
);

// Get logged-in user's subscription
router.get(
  "/me",
  protect,
  roleMiddleware(["doctor", "hospital"]),
  subscriptionController.getMySubscription
);

// Create Razorpay order
router.post(
  "/create-order",
  protect,
  roleMiddleware(["doctor", "hospital"]),
  subscriptionController.createOrder
);

// Verify Razorpay payment & activate subscription
router.post(
  "/verify-payment",
  protect,
  roleMiddleware(["doctor", "hospital"]),
  subscriptionController.verifyPayment
);

// Upgrade a subscription (keep parameterized route LAST)
router.patch(
  "/:subscriptionId/upgrade",
  protect,
  roleMiddleware(["doctor", "hospital"]),
  subscriptionController.upgradeSubscription
);

module.exports = router;
