const File = require("../models/file");
const Hospital = require("../models/Hospital");
const Patient = require("../models/Patient");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// ================= CREATE FILE =================
exports.createFile = asyncHandler(async (req, res, next) => {
  const { patient_id, hospital_id } = req.body;

  if (!patient_id || !hospital_id) {
    return next(new AppError("patient_id and hospital_id are required", 400));
  }

  const existing = await File.findOne({ patient_id, hospital_id });
  if (existing) {
    return next(new AppError("File already exists for this patient & hospital", 400));
  }

  const file = await File.create({ patient_id, hospital_id });

  res.status(201).json({ success: true, data: file });
});

// ================= GET ALL FILES (HOSPITAL) =================
exports.getAllFilesByHospital = asyncHandler(async (req, res, next) => {
  let hospital_id;

  if (req.user.role === "hospital") {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    hospital_id = hospital?._id;
  } else {
    hospital_id = req.query.hospital_id;
  }

  if (!hospital_id) {
    return next(new AppError("Hospital ID required", 400));
  }

  const files = await File.find({ hospital_id }).populate({
    path: "patient_id",
    populate: { path: "userId", select: "name email phone userId" },
  });

  res.status(200).json({ success: true, count: files.length, data: files });
});

// ================= GET FILES FOR PATIENT =================
exports.getPatientFiles = asyncHandler(async (req, res, next) => {
  let patient_id;

  if (req.user.role === "patient") {
    const patient = await Patient.findOne({ userId: req.user.id });
    patient_id = patient?._id;
  } else {
    patient_id = req.params.patientId;
  }

  if (!patient_id) {
    return next(new AppError("Patient ID required", 400));
  }

  const files = await File.find({ patient_id }).populate("hospital_id");

  res.status(200).json({ success: true, count: files.length, data: files });
});

// ================= UPDATE FILE STATUS =================
exports.updateFileStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const { id } = req.params;

  if (!["active", "inactive"].includes(status)) {
    return next(new AppError("Invalid status value", 400));
  }

  const file = await File.findByIdAndUpdate(id, { status }, { new: true });
  if (!file) return next(new AppError("File not found", 404));

  res.status(200).json({ success: true, data: file });
});
