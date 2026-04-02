const Doctor = require("../models/Doctor");
const asyncHandler = require("../utils/asyncHandler"); // Wraps async routes to handle errors
const AppError = require("../utils/AppError"); // Custom error class
const jwt = require("jsonwebtoken");

// 🔹 Helper: Generate JWT
const generateToken = (doctor) => {
  return jwt.sign(
    { id: doctor._id, role: doctor.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ==============================
// 🔓 Doctor Controller
// ==============================

// ✅ Register a Doctor
exports.registerDoctor = asyncHandler(async (req, res, next) => {
  const { name, email, password, specialization, experienceYears, hospital } =
    req.body;

  if (!name || !email || !password || !specialization || !experienceYears || !hospital) {
    return next(new AppError("All required fields must be provided", 400));
  }

  const existingDoctor = await Doctor.findOne({ email, hospital });
  if (existingDoctor) {
    return next(new AppError("Doctor with this email already exists in the hospital", 400));
  }

  const doctor = await Doctor.create(req.body);

  res.status(201).json({
    success: true,
    data: {
      id: doctor._id,
      name: doctor.name,
      email: doctor.email,
      role: doctor.role,
      token: generateToken(doctor),
    },
  });
});

// ✅ Doctor Login
exports.loginDoctor = asyncHandler(async (req, res, next) => {
  const { email, password, hospital } = req.body;

  if (!email || !password || !hospital) {
    return next(new AppError("Please provide email, password and hospital", 400));
  }

  const doctor = await Doctor.findOne({ email, hospital }).select("+password");
  if (!doctor) {
    return next(new AppError("Invalid credentials", 401));
  }

  const isMatch = await doctor.comparePassword(password);
  if (!isMatch) {
    return next(new AppError("Invalid credentials", 401));
  }

  doctor.lastLogin = new Date();
  await doctor.save();

  res.status(200).json({
    success: true,
    data: {
      id: doctor._id,
      name: doctor.name,
      email: doctor.email,
      role: doctor.role,
      token: generateToken(doctor),
    },
  });
});

// ✅ Get Doctor Profile
exports.getDoctorProfile = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ userId: req.user.id }).populate("hospital");
  if (!doctor) return next(new AppError("Doctor not found", 404));

  res.status(200).json({ success: true, data: doctor });
});

// ✅ Update Doctor Profile
exports.updateDoctorProfile = asyncHandler(async (req, res, next) => {
  const updates = req.body;

  // Prevent role change
  if (updates.role) delete updates.role;

  const doctor = await Doctor.findOneAndUpdate({ userId: req.user.id }, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: doctor });
});

// ✅ Get All Doctors (for admin/hospital)
exports.getAllDoctors = asyncHandler(async (req, res, next) => {
  const doctors = await Doctor.find({ hospital: req.user.hospital }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: doctors });
});

// ✅ Delete Doctor
exports.deleteDoctor = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (!doctor) return next(new AppError("Doctor not found", 404));

  res.status(200).json({ success: true, message: "Doctor deleted successfully" });
});