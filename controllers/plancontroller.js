const Plan = require("../models/Plan");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// GET /api/plans — public (hospitals need to see plans)
exports.getAllPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find({ status: "active" }).sort({ price: 1 });
  res.json({ success: true, data: plans });
});

// POST /api/plans — admin only
exports.createPlan = asyncHandler(async (req, res) => {
  const { name, price, duration, features } = req.body;

  if (!name || price == null || !duration) {
    return res.status(400).json({ success: false, message: "Name, price, and duration are required" });
  }

  const plan = await Plan.create({ name, price, duration, features });
  res.status(201).json({ success: true, data: plan });
});

// PUT /api/plans/:id — admin only
exports.updatePlan = asyncHandler(async (req, res, next) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!plan) return next(new AppError("Plan not found", 404));
  res.json({ success: true, data: plan });
});

// DELETE /api/plans/:id — admin only
exports.deletePlan = asyncHandler(async (req, res, next) => {
  const plan = await Plan.findByIdAndDelete(req.params.id);
  if (!plan) return next(new AppError("Plan not found", 404));
  res.json({ success: true, message: "Plan deleted" });
});
