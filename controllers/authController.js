const User = require("../models/user");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const sendEmail = require("../sendEmail");
const generatePatientId = require("../utils/generatePatientId");

// ================= TOKEN FUNCTIONS =================
const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// ================= REGISTER =================
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return next(new AppError("All fields are required", 400));
  }

  const validRoles = ["patient", "doctor", "hospital"];
  if (!validRoles.includes(role)) {
    return next(new AppError("Invalid role", 400));
  }

  const userExists = await User.findOne({ email: email.toLowerCase(), role });
  if (userExists) return next(new AppError(`An account with this email already exists as ${role}`, 400));

  // Build user data
  const userData = {
    name,
    email: email.toLowerCase(),
    password,
    role,
    phone: req.body.phone,
    userId: req.body.userId,
  };

  // Role-specific User fields
  if (role === "patient") {
    // Patient can choose their own ID (like Instagram username) or auto-generate from name
    const { id: patientId, error: idError } = await generatePatientId(
      Patient,
      name,
      req.body.patientId || null // optional: patient's chosen ID
    );
    if (idError) return next(new AppError(idError, 400));
    userData.userId = patientId;
    userData.gender = req.body.gender;
    userData.dateOfBirth = req.body.dob || req.body.dateOfBirth;
    userData.bloodGroup = req.body.bloodGroup;
    userData.aadharNumber = req.body.aadharNumber;
    userData.status = "active";
  }

  if (role === "doctor") {
    userData.licenseNumber = req.body.licenseNumber || req.body.regNo;
    userData.status = "active";
  }

  if (role === "hospital") {
    userData.hospitalUniqueId = req.body.hospitalUniqueId || req.body.regNo;
    userData.status = "pending"; // hospitals need admin approval
  }

  // Handle file upload for verification document
  if (req.file) {
    userData.verificationDocument = req.file.path;
  }

  const user = await User.create(userData);

  // Create role-specific profile document
  if (role === "patient") {
    await Patient.create({
      patient_id: userData.userId, // NXV-XXXX-XXXX
      userId: user._id,
      phone: req.body.phone,
      gender: req.body.gender,
      dateOfBirth: req.body.dob || req.body.dateOfBirth,
      bloodGroup: req.body.bloodGroup,
      adharcard_no: req.body.aadharNumber,
    });
  }

  if (role === "doctor") {
    await Doctor.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: req.body.phone,
      specialization: req.body.type || req.body.specialization || "General",
      experienceYears: parseInt(req.body.experience) || 0,
      address: req.body.address,
      licenseDocument: req.file ? req.file.path : null,
    });
  }

  if (role === "hospital") {
    await Hospital.create({
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: req.body.phone,
      hospital_type: req.body.type || "Private",
      registration_number: req.body.regNo,
      full_address: req.body.address,
      location: {
        state: req.body.state,
        city: req.body.city,
        pincode: req.body.pincode,
      },
      license_file_url: req.file ? req.file.path : null,
      verification_status: "pending",
    });
  }

  const token = generateAccessToken(user);

  res.status(201).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      userId: user.userId,
    },
  });
});

// ================= LOGIN =================
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password, role, identifier } = req.body;

  const loginId = email || identifier;
  if (!loginId || !password) {
    return next(new AppError("Email/ID and password are required", 400));
  }

  // Support login by email OR userId, optionally filtered by role
  const query = {
    $or: [
      { email: loginId.toLowerCase() },
      { userId: loginId },
    ],
  };
  if (role) query.role = role;

  const user = await User.findOne(query).select("+password");
  if (!user) return next(new AppError("Invalid credentials", 401));

  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) return next(new AppError("Invalid credentials", 401));

  // Check account status
  if (user.status === "pending") {
    return next(
      new AppError("Your account is under verification. Please wait.", 403)
    );
  }
  if (user.status === "rejected") {
    return next(new AppError("Your account has been rejected.", 403));
  }

  // Check hospital access denied
  if (user.role === "hospital") {
    const Hospital = require("../models/Hospital");
    const hospital = await Hospital.findOne({ userId: user._id });
    if (hospital && hospital.access === "denied") {
      return next(new AppError("Your hospital access has been denied by admin.", 403));
    }
  }

  const token = generateAccessToken(user);

  res.json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      userId: user.userId,
      phone: user.phone,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      bloodGroup: user.bloodGroup,
      aadharNumber: user.aadharNumber,
      avatar: user.avatar,
    },
  });
});

// ================= ADMIN LOGIN =================
exports.adminLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Email and password are required", 400));
  }

  // Check against env vars or find admin user in DB
  const adminEmail = process.env.ADMIN_EMAIL || "admin@nexiva.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  if (email === adminEmail && password === adminPassword) {
    // Find or create admin user
    let adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      adminUser = await User.create({
        name: "Nexiva Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        status: "active",
      });
    }

    const token = generateAccessToken(adminUser);
    return res.json({
      success: true,
      token,
      user: {
        _id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: "admin",
      },
    });
  }

  return next(new AppError("Invalid admin credentials", 401));
});

// ================= FORGOT PASSWORD =================
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email, role } = req.body;
  if (!email) return next(new AppError("Email is required", 400));

  // Find user by email + role (if role provided), otherwise find any user with that email
  const query = { email: email.toLowerCase() };
  if (role) query.role = role;

  const users = await User.find(query);
  if (users.length === 0) return next(new AppError("No user found with that email", 404));

  // Generate single OTP and apply to all matching accounts (same person, different roles)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  for (const user of users) {
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save({ validateBeforeSave: false });
  }

  // Send email
  try {
    await sendEmail({
      to: email.toLowerCase(),
      subject: "Nexiva - Password Reset OTP",
      html: `<p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p>`,
    });

    res.json({
      success: true,
      message: "OTP sent to your email",
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (err) {
    for (const user of users) {
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }
    return next(new AppError("Failed to send email. Try again later.", 500));
  }
});

// ================= VERIFY OTP =================
exports.verifyOtp = asyncHandler(async (req, res, next) => {
  const { email, otp, role } = req.body;
  if (!email || !otp) {
    return next(new AppError("Email and OTP are required", 400));
  }

  const query = { email: email.toLowerCase() };
  if (role) query.role = role;

  const user = await User.findOne(query).select("+otp +otpExpires");

  if (!user) return next(new AppError("User not found", 404));

  if (!user.otp || user.otp !== otp) {
    return next(new AppError("Invalid OTP", 400));
  }

  if (user.otpExpires < new Date()) {
    return next(new AppError("OTP has expired", 400));
  }

  res.json({ success: true, message: "OTP verified successfully" });
});

// ================= RESET PASSWORD =================
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otp, newPassword, role } = req.body;
  if (!email || !otp || !newPassword) {
    return next(new AppError("Email, OTP, and new password are required", 400));
  }

  const query = { email: email.toLowerCase() };
  if (role) query.role = role;

  // Find all matching accounts (same email, possibly different roles)
  const users = await User.find(query).select("+otp +otpExpires +password");

  if (users.length === 0) return next(new AppError("User not found", 404));

  // Verify OTP against the first matching user (all share same OTP)
  const firstUser = users[0];
  if (!firstUser.otp || firstUser.otp !== otp) {
    return next(new AppError("Invalid OTP", 400));
  }
  if (firstUser.otpExpires < new Date()) {
    return next(new AppError("OTP has expired", 400));
  }

  // Reset password for all matching accounts (if role not specified, reset all roles)
  for (const user of users) {
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
  }

  res.json({ success: true, message: "Password reset successfully" });
});

// ================= CHANGE PASSWORD =================
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(
      new AppError("Current password and new password are required", 400)
    );
  }

  const user = await User.findById(req.user.id).select("+password");
  if (!user) return next(new AppError("User not found", 404));

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) return next(new AppError("Current password is incorrect", 401));

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: "Password changed successfully" });
});

// ================= GET ME =================
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("User not found", 404));
  res.json({ success: true, data: user });
});

// ================= CHECK USER ID AVAILABILITY =================
exports.checkUserId = asyncHandler(async (req, res, next) => {
  const { userId, role } = req.body;
  if (!userId) return next(new AppError("userId is required", 400));

  // For patient role, validate ID format
  if (role === "patient") {
    const { checkPatientIdAvailability } = require("../utils/generatePatientId");
    const result = await checkPatientIdAvailability(Patient, userId);
    return res.json({ success: true, available: result.available, error: result.error });
  }

  const existing = await User.findOne({ userId, role });
  res.json({
    success: true,
    available: !existing,
  });
});
