const File = require("../models/file");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");


/* =====================================================
   CREATE FILE
   POST /api/files
===================================================== */
exports.createFile = asyncHandler(async (req, res, next) => {

  const hospital_id = req.user.id;
  const { patient_id, status } = req.body;

  const existingfile = await File.findOne({ patient_id, hospital_id });

  if (existingfile) {
    return next(new AppError("File already exists for this patient in this hospital", 400));
  }

  const newFile = await File.create({
    patient_id,
    hospital_id,
    status: status || "active",
  });

  res.status(201).json({
    success: true,
    message: "Patient file created successfully",
    data: newFile,
  });

});


/* =====================================================
   GET ALL FILES
   GET /api/files
===================================================== */
exports.getAllFiles = asyncHandler(async (req, res, next) => {

  const hospital_id = req.user.id;

  const files = await File.find({ hospital_id })
    .populate("patient_id", "name email phone")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: files.length,
    data: files,
  });

});


/* =====================================================
   GET SINGLE FILE
   GET /api/files/:id
===================================================== */
exports.getSingleFile = asyncHandler(async (req, res, next) => {

  const hospital_id = req.user.id;

  const file = await File.findOne({
    _id: req.params.id,
    hospital_id,
  }).populate("patient_id", "name email phone");

  if (!file) {
    return next(new AppError("File not found", 404));
  }

  res.status(200).json({
    success: true,
    data: file
  });

});


/* =====================================================
   UPDATE FILE
   PUT /api/files/:id
===================================================== */
exports.updateFile = asyncHandler(async (req, res, next) => {

  const hospital_id = req.user.id;

  const file = await File.findOneAndUpdate(
    { _id: req.params.id, hospital_id },
    { ...req.body },
    { new: true, runValidators: true }
  );

  if (!file) {
    return next(new AppError("File not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "File updated successfully",
    data: file,
  });

});


/* =====================================================
   DELETE FILE
   DELETE /api/files/:id
===================================================== */
exports.deleteFile = asyncHandler(async (req, res, next) => {

  const hospital_id = req.user.id;

  const file = await File.findOneAndDelete({
    _id: req.params.id,
    hospital_id,
  });

  if (!file) {
    return next(new AppError("File not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "File deleted successfully",
  });

});