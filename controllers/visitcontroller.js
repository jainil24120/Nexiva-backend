const Visit = require("../models/visit");
const File = require("../models/file");
const Hospital = require("../models/Hospital");
const Doctor = require("../models/Doctor");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// Helper: get hospital profile ID from user
const getHospitalId = async (user) => {
  if (user.role === "hospital") {
    const hospital = await Hospital.findOne({ userId: user.id });
    return hospital?._id;
  }
  return null;
};

// Helper: get doctor profile ID from user
const getDoctorId = async (user) => {
  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user.id });
    return doctor?._id;
  }
  return null;
};

// Get file IDs accessible by this user's hospital
const getAccessibleFileIds = async (user) => {
  if (user.role === "hospital") {
    const hospitalId = await getHospitalId(user);
    return hospitalId ? await File.find({ hospital_id: hospitalId }).distinct("_id") : [];
  }
  return [];
};

// Verify the user owns or is associated with the visit
const canAccessVisit = async (user, visit) => {
  if (user.role === "hospital") {
    const fileIds = await getAccessibleFileIds(user);
    return fileIds.some((fid) => fid.toString() === visit.file_id?.toString());
  }
  if (user.role === "doctor") {
    const doctorId = await getDoctorId(user);
    return doctorId && visit.doctor_id?.toString() === doctorId.toString();
  }
  return false;
};

/* CREATE VISIT - POST /api/visits */
exports.createVisit = asyncHandler(async (req, res, next) => {
  const { file_id, doctor_id, visit_type, symptoms, diagnosis, notes } = req.body;

  // Verify file exists
  const file = await File.findById(file_id);
  if (!file) return next(new AppError("Invalid file_id", 400));

  // Hospital can only create visits for their own files
  if (req.user.role === "hospital") {
    const hospitalId = await getHospitalId(req.user);
    if (!hospitalId || file.hospital_id?.toString() !== hospitalId.toString()) {
      return next(new AppError("You can only create visits for your own patients", 403));
    }
  }

  // Resolve doctor_id: accept MongoDB ObjectId or human-readable userId
  let resolvedDoctorId = doctor_id;
  const mongoose = require("mongoose");
  const isHex24 = /^[0-9a-fA-F]{24}$/.test(doctor_id);

  if (!isHex24) {
    // Look up by human-readable userId
    const User = require("../models/user");
    const doctorUser = await User.findOne({ userId: doctor_id, role: "doctor" });
    if (!doctorUser) return next(new AppError("Doctor not found with this ID", 404));
    const doctor = await Doctor.findOne({ userId: doctorUser._id });
    if (!doctor) return next(new AppError("Doctor profile not found", 404));
    resolvedDoctorId = doctor._id;
  }

  const visit = await Visit.create({
    file_id,
    doctor_id: resolvedDoctorId,
    visit_type,
    symptoms,
    diagnosis,
    notes,
  });

  res.status(201).json({
    success: true,
    message: "Visit created successfully",
    data: visit,
  });
});

/* GET ALL VISITS - GET /api/visits */
exports.getAllVisits = asyncHandler(async (req, res, next) => {
  let query = {};

  if (req.user.role === "hospital") {
    const fileIds = await getAccessibleFileIds(req.user);
    query.file_id = { $in: fileIds };
  } else if (req.user.role === "doctor") {
    const doctorId = await getDoctorId(req.user);
    if (doctorId) query.doctor_id = doctorId;
    else return res.json({ success: true, count: 0, data: [] });
  }

  const visits = await Visit.find(query)
    .populate({
      path: "file_id",
      populate: [
        {
          path: "patient_id",
          populate: { path: "userId", select: "name email phone" },
        },
        {
          path: "hospital_id",
          select: "name location",
        },
      ],
    })
    .populate({
      path: "doctor_id",
      select: "name email specialization userId",
      populate: { path: "userId", select: "name userId" },
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: visits.length,
    data: visits,
  });
});

/* GET SINGLE VISIT - GET /api/visits/:id */
exports.getSingleVisit = asyncHandler(async (req, res, next) => {
  const visit = await Visit.findById(req.params.id)
    .populate("file_id")
    .populate("doctor_id", "name email");

  if (!visit) return next(new AppError("Visit not found", 404));

  // Verify access
  const allowed = await canAccessVisit(req.user, visit);
  if (!allowed) return next(new AppError("Access denied", 403));

  res.status(200).json({ success: true, data: visit });
});

/* UPDATE VISIT - PUT /api/visits/:id */
exports.updateVisit = asyncHandler(async (req, res, next) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit) return next(new AppError("Visit not found", 404));

  // Verify access
  const allowed = await canAccessVisit(req.user, visit);
  if (!allowed) return next(new AppError("Access denied", 403));

  const updatedVisit = await Visit.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Visit updated successfully",
    data: updatedVisit,
  });
});

/* DELETE VISIT - DELETE /api/visits/:id */
exports.deleteVisit = asyncHandler(async (req, res, next) => {
  const visit = await Visit.findById(req.params.id);
  if (!visit) return next(new AppError("Visit not found", 404));

  // Only hospital that owns the file can delete
  if (req.user.role === "hospital") {
    const fileIds = await getAccessibleFileIds(req.user);
    if (!fileIds.some((fid) => fid.toString() === visit.file_id?.toString())) {
      return next(new AppError("Access denied", 403));
    }
  } else if (req.user.role === "doctor") {
    return next(new AppError("Only hospitals can delete visits", 403));
  }

  await Visit.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Visit deleted successfully",
  });
});
