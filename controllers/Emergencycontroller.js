const Patient = require("../models/Patient");
const DoctorHospital = require("../models/doctorhospital");
const File = require("../models/file");

const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

/**
 * DOCTOR EMERGENCY ACCESS
 * PATCH /api/patients/:patientId/emergency-access
 */
exports.addEmergencyAccessLog = asyncHandler(async (req, res, next) => {
  const { patientId } = req.params;
  const { reason } = req.body;

  const patient = await Patient.findById(patientId);
  if (!patient) {
    return next(new AppError("Patient not found", 404));
  }

  if (!patient.isEmergencyCase) {
    return next(new AppError("Emergency mode is not active for this patient", 400));
  }

  // Log emergency access
  patient.emergencyAccessLogs.push({
    doctorId: req.user.id,
    reason: reason || "Emergency access",
    accessedAt: new Date(),
  });

  await patient.save();

  res.status(200).json({
    success: true,
    message: "Emergency access granted & logged successfully",
  });
});
