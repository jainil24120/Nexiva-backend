const Subscription = require("../models/Subscription");

const subscriptionGuard = (requiredPlan) => async (req, res, next) => {
  const subscription = await Subscription.findById(req.user.subscription);

  if (!subscription || !subscription.isActive) {
    return res.status(403).json({ message: "No active subscription" });
  }

  if (requiredPlan && subscription.plan !== requiredPlan) {
    return res.status(403).json({
      message: `This feature requires ${requiredPlan} plan`
    });
  }

  if (subscription.endDate && subscription.endDate < new Date()) {
    subscription.isActive = false;
    await subscription.save();
    return res.status(403).json({ message: "Subscription expired" });
  }

  next();
};

module.exports = subscriptionGuard;
