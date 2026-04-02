// controllers/hospitalDashboardController.js
const HospitalDashboard = require("../models/Hospitaldashboard");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

/* =====================================================
   GET DASHBOARD DATA
   GET /api/hospital-dashboard/me
   Access: Hospital
===================================================== */
exports.getMyDashboard = asyncHandler(async (req, res, next) => {
  const hospital_id = req.user.id; // from auth middleware

  let dashboard = await HospitalDashboard.findOne({ hospital_id });

  // Agar dashboard exist nahi karta toh create karo
  if (!dashboard) {
    dashboard = await HospitalDashboard.create({ hospital_id });
  }

  res.status(200).json({
    success: true,
    data: dashboard,
  });
});

/* =====================================================
   UPDATE DASHBOARD COUNTERS (Optional manual update)
   PATCH /api/hospital-dashboard/me
   Access: Hospital
===================================================== */
exports.updateDashboard = asyncHandler(async (req, res, next) => {
  const hospital_id = req.user.id;
  const { total_patients, total_doctors } = req.body;

  const dashboard = await HospitalDashboard.findOneAndUpdate(
    { hospital_id },
    { total_patients, total_doctors, last_updated: Date.now() },
    { new: true, runValidators: true }
  );

  if (!dashboard) {
    return next(new AppError("Dashboard not found", 404));
  }

  res.status(200).json({
    success: true,
    data: dashboard,
  });
});