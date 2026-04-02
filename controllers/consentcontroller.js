const Consent = require("../models/consentModel");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

exports.grantConsent = asyncHandler(async (req, res, next) => {

  if (!req.body) {
    return next(new AppError("Consent data is required", 400));
  }

  const consent = await Consent.create(req.body);

  res.status(201).json({
    success: true,
    data: consent
  });

});