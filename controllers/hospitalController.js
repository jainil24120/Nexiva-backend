const User = require("../models/user");
const Hospital = require("../models/Hospital");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const DoctorHospital = require("../models/doctorhospital");
const File = require("../models/file");
const Subscription = require("../models/Subscription");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ================= AUTH =================
exports.registerHospital = asyncHandler(async (req, res, next) => {
  const { name, email, password, hospitalUniqueId } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return next(new AppError("Email already exists", 400));

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: "hospital",
    hospitalUniqueId,
    status: "pending",
  });

  await Hospital.create({
    userId: user._id,
    name,
    email: email.toLowerCase(),
    phone: req.body.phone,
    hospital_type: req.body.type || "Private",
    registration_number: req.body.regNo || hospitalUniqueId,
    full_address: req.body.address,
    location: {
      state: req.body.state,
      city: req.body.city,
      pincode: req.body.pincode,
    },
    verification_status: "pending",
  });

  res.status(201).json({
    success: true,
    token: generateToken(user),
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status },
  });
});

exports.loginHospital = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase(), role: "hospital" }).select("+password");
  if (!user) return next(new AppError("Invalid credentials", 401));

  const isMatch = await user.matchPassword(password);
  if (!isMatch) return next(new AppError("Invalid credentials", 401));

  if (user.status === "pending") {
    return next(new AppError("Your account is under verification", 403));
  }

  if (user.status === "rejected") {
    return next(new AppError("Your account has been rejected.", 403));
  }

  // Check if hospital access is denied
  const hospital = await Hospital.findOne({ userId: user._id });
  if (hospital && hospital.access === "denied") {
    return next(new AppError("Your hospital access has been denied by admin.", 403));
  }

  res.json({
    success: true,
    token: generateToken(user),
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, status: user.status },
  });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: "Use /api/auth/forgot-password" });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  res.status(501).json({ success: false, message: "Use /api/auth/reset-password" });
});

// ================= HOSPITAL PROFILE =================
exports.getHospitalProfile = asyncHandler(async (req, res, next) => {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return next(new AppError("Hospital profile not found", 404));
  res.json({ success: true, hospital });
});

exports.updateHospitalProfile = asyncHandler(async (req, res, next) => {
  const hospital = await Hospital.findOneAndUpdate(
    { userId: req.user.id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!hospital) return next(new AppError("Hospital not found", 404));
  res.json({ success: true, hospital });
});

exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select("+password");
  if (!user) return next(new AppError("User not found", 404));

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) return next(new AppError("Current password is incorrect", 401));

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: "Password changed" });
});

// ================= DOCTOR MANAGEMENT =================
exports.addDoctor = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.body;
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return next(new AppError("Hospital not found", 404));

  // Find doctor by userId (human-readable ID)
  const doctorUser = await User.findOne({ userId: doctorId, role: "doctor" });
  if (!doctorUser) return next(new AppError("Doctor not found with this ID", 404));

  const doctor = await Doctor.findOne({ userId: doctorUser._id });
  if (!doctor) return next(new AppError("Doctor profile not found", 404));

  // Check if already assigned
  const existing = await DoctorHospital.findOne({ doctor_id: doctor._id, hospital_id: hospital._id });
  if (existing) return next(new AppError("Doctor already assigned to this hospital", 400));

  const mapping = await DoctorHospital.create({
    doctor_id: doctor._id,
    hospital_id: hospital._id,
    status: "active",
  });

  // Populate and return the doctor data so frontend can update the table
  const populatedDoctor = await Doctor.findById(doctor._id)
    .populate("userId", "name email userId phone");

  res.json({
    success: true,
    message: "Doctor added to hospital",
    data: {
      ...populatedDoctor.toObject(),
      mappingId: mapping._id,
      mappingStatus: mapping.status,
      joinedAt: mapping.joined_at,
    },
  });
});

exports.getHospitalDoctors = asyncHandler(async (req, res, next) => {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return next(new AppError("Hospital not found", 404));

  const mappings = await DoctorHospital.find({ hospital_id: hospital._id })
    .populate({
      path: "doctor_id",
      populate: { path: "userId", select: "name email userId phone" },
    });

  const doctors = mappings.map((m) => ({
    ...m.doctor_id?.toObject(),
    mappingId: m._id,
    mappingStatus: m.status,
    joinedAt: m.joined_at,
  }));

  res.json({ success: true, data: doctors });
});

exports.updateDoctor = asyncHandler(async (req, res, next) => {
  const doctorMappingId = req.params.doctorMappingId || req.params.doctorId;
  const { status } = req.body;

  const mapping = await DoctorHospital.findByIdAndUpdate(
    doctorMappingId,
    { status },
    { new: true }
  );
  if (!mapping) return next(new AppError("Doctor-hospital mapping not found", 404));

  res.json({ success: true, message: "Doctor status updated", mapping });
});

exports.removeDoctor = asyncHandler(async (req, res, next) => {
  const doctorMappingId = req.params.doctorMappingId || req.params.doctorId;
  const mapping = await DoctorHospital.findByIdAndDelete(doctorMappingId);
  if (!mapping) return next(new AppError("Mapping not found", 404));
  res.json({ success: true, message: "Doctor removed from hospital" });
});

exports.updateDoctorAccess = asyncHandler(async (req, res, next) => {
  const doctorMappingId = req.params.doctorMappingId || req.params.doctorId;
  const { status } = req.body;
  const mapping = await DoctorHospital.findByIdAndUpdate(
    doctorMappingId,
    { status },
    { new: true }
  );
  if (!mapping) return next(new AppError("Mapping not found", 404));
  res.json({ success: true, message: "Doctor access updated" });
});

// ================= PATIENT MANAGEMENT =================
exports.getHospitalPatients = asyncHandler(async (req, res, next) => {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return next(new AppError("Hospital not found", 404));

  // Get patients who have a file at this hospital
  const files = await File.find({ hospital_id: hospital._id, status: "active" })
    .populate({
      path: "patient_id",
      select: "+adharcard_no",
      populate: { path: "userId", select: "name email phone userId" },
    });

  const patients = files
    .filter((f) => f.patient_id)
    .map((f) => {
      const patientObj = f.patient_id.toObject({ virtuals: true });
      return {
        ...patientObj,
        adharcard_no: f.patient_id.adharcard_no,
        fileId: f._id,
        fileStatus: f.status,
      };
    });

  res.json({ success: true, data: patients });
});

// ================= CREATE PATIENT WITH FILE =================
exports.createPatientWithFile = asyncHandler(async (req, res, next) => {
  const generatePatientId = require("../utils/generatePatientId");
  const sendEmail = require("../sendEmail");

  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return next(new AppError("Hospital not found", 404));

  const { firstName, lastName, email, phone, aadharNumber, dob, gender, bloodGroup } = req.body;

  if (!firstName || !aadharNumber) {
    return next(new AppError("firstName and aadharNumber are required", 400));
  }

  if (!email) {
    return next(new AppError("Email is required so the patient can set their password", 400));
  }

  // Check if patient user already exists by email or aadhar
  let patientUser = null;
  let isNewUser = false;
  patientUser = await User.findOne({ email: email.toLowerCase(), role: "patient" });
  if (!patientUser && aadharNumber) patientUser = await User.findOne({ aadharNumber, role: "patient" });

  let patient;
  if (patientUser) {
    // Patient exists — find or create Patient profile
    patient = await Patient.findOne({ userId: patientUser._id });
    if (!patient) {
      const { id: pId } = await generatePatientId(Patient, patientUser.name);
      patient = await Patient.create({
        patient_id: pId,
        userId: patientUser._id,
        phone, gender, dateOfBirth: dob, bloodGroup, adharcard_no: aadharNumber,
      });
      // Update User.userId if not set
      if (!patientUser.userId) {
        patientUser.userId = pId;
        await patientUser.save({ validateBeforeSave: false });
      }
    }
  } else {
    // Create new User + Patient
    isNewUser = true;
    const name = `${firstName} ${lastName || ""}`.trim();
    const { id: pId } = await generatePatientId(Patient, name);

    // Generate temporary password — patient will set their own via email
    const tempPassword = "Nexiva@" + Math.random().toString(36).slice(2, 10);

    patientUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: tempPassword,
      role: "patient",
      status: "active",
      phone,
      gender,
      dateOfBirth: dob,
      bloodGroup,
      aadharNumber,
      userId: pId,
    });

    patient = await Patient.create({
      patient_id: pId,
      userId: patientUser._id,
      phone, gender, dateOfBirth: dob,
      bloodGroup, adharcard_no: aadharNumber,
    });

    // Send password setup email to the patient
    try {
      // Generate OTP for password reset
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      patientUser.otp = otp;
      patientUser.otpExpires = otpExpires;
      await patientUser.save({ validateBeforeSave: false });

      await sendEmail({
        to: email.toLowerCase(),
        subject: "Welcome to Nexiva - Set Your Password",
        html: `
          <h2>Welcome to Nexiva!</h2>
          <p>An account has been created for you by <strong>${hospital.name}</strong>.</p>
          <p>Your Patient ID: <strong>${pId}</strong></p>
          <p>To set your password, use this OTP on the Nexiva Patient Portal:</p>
          <h1 style="text-align:center;color:#1ec8e8;letter-spacing:4px;">${otp}</h1>
          <p>Steps:</p>
          <ol>
            <li>Go to the Nexiva Patient Portal</li>
            <li>Click "Forgot Password"</li>
            <li>Enter your email: <strong>${email.toLowerCase()}</strong></li>
            <li>Enter the OTP above</li>
            <li>Set your new password</li>
          </ol>
          <p>This OTP is valid for 24 hours.</p>
          <p>- Team Nexiva</p>
        `,
      });
    } catch (emailErr) {
      console.warn("Failed to send welcome email:", emailErr.message);
      // Don't fail the request — patient can still use forgot-password later
    }
  }

  // Create File (patient-hospital link) if not exists
  let file = await File.findOne({ patient_id: patient._id, hospital_id: hospital._id });
  if (!file) {
    file = await File.create({ patient_id: patient._id, hospital_id: hospital._id, status: "active" });
  }

  res.status(201).json({
    success: true,
    message: isNewUser
      ? `Patient created (ID: ${patient.patient_id}). Password setup email sent to ${email}.`
      : "Existing patient linked to your hospital.",
    data: {
      patient,
      file,
      patientId: patient.patient_id,
      user: { _id: patientUser._id, name: patientUser.name, email: patientUser.email },
    },
  });
});

// ================= EMERGENCY LOGS =================
exports.getEmergencyLogs = asyncHandler(async (req, res) => {
  // Get patients with emergency access logs for this hospital
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) {
    return res.json({ success: true, logs: [] });
  }

  const files = await File.find({ hospital_id: hospital._id }).select("patient_id");
  const patientIds = files.map((f) => f.patient_id);

  const patients = await Patient.find({
    _id: { $in: patientIds },
    "emergencyAccessLogs.0": { $exists: true },
  }).select("emergencyAccessLogs userId");

  const logs = patients.flatMap((p) =>
    p.emergencyAccessLogs.map((log) => ({
      patientId: p._id,
      ...log.toObject(),
    }))
  );

  res.json({ success: true, logs });
});

// ================= SUBSCRIPTION & BILLING =================
exports.getSubscriptionDetails = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  const ownerId = hospital ? hospital._id : req.user.id;

  const subscription = await Subscription.findOne({
    ownerId,
    ownerModel: "Hospital",
  }).sort({ createdAt: -1 });

  res.json({ success: true, subscription });
});

exports.getBillingHistory = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  const ownerId = hospital ? hospital._id : req.user.id;

  const subscriptions = await Subscription.find({
    ownerId,
    ownerModel: "Hospital",
  }).sort({ createdAt: -1 });

  res.json({ success: true, billing: subscriptions });
});

// ================= SETTINGS =================
exports.getHospitalSettings = asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  const user = await User.findById(req.user.id).select("name email phone");
  res.json({ success: true, settings: { hospital, user } });
});

exports.updateHospitalSettings = asyncHandler(async (req, res, next) => {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return next(new AppError("Hospital not found", 404));

  // Update allowed fields
  const { name, phone, email, full_address, hospital_type, location, logo } = req.body;

  if (name) hospital.name = name;
  if (phone) hospital.phone = phone;
  if (email) hospital.email = email;
  if (full_address) hospital.full_address = full_address;
  if (hospital_type) hospital.hospital_type = hospital_type;
  if (logo !== undefined) hospital.logo = logo;

  if (location) {
    if (!hospital.location) hospital.location = {};
    if (location.city) hospital.location.city = location.city;
    if (location.state) hospital.location.state = location.state;
    if (location.pincode) hospital.location.pincode = location.pincode;
  }

  await hospital.save();

  // Also update User name/email if changed
  if (name || email) {
    const userUpdate = {};
    if (name) userUpdate.name = name;
    if (email) userUpdate.email = email;
    await User.findByIdAndUpdate(req.user.id, userUpdate);
  }

  res.json({ success: true, message: "Settings updated", hospital });
});

// ================= ADMIN CONTROLS =================
exports.getAllHospitals = asyncHandler(async (req, res) => {
  const hospitals = await Hospital.find().populate("userId", "name email status");
  res.json({ success: true, hospitals });
});

exports.updateVerificationStatus = asyncHandler(async (req, res, next) => {
  const { hospitalId } = req.params;
  const { verification_status } = req.body;

  const hospital = await Hospital.findByIdAndUpdate(
    hospitalId,
    { verification_status },
    { new: true }
  );
  if (!hospital) return next(new AppError("Hospital not found", 404));

  // Also update User status
  if (verification_status === "verified") {
    await User.findByIdAndUpdate(hospital.userId, { status: "active" });
  } else if (verification_status === "rejected") {
    await User.findByIdAndUpdate(hospital.userId, { status: "rejected" });
  }

  res.json({ success: true, message: "Verification status updated", hospital });
});

exports.updateHospitalStatus = asyncHandler(async (req, res, next) => {
  const { hospitalId } = req.params;
  const { status, access } = req.body;

  const update = {};
  if (status) update.status = status;
  if (access) update.access = access;

  const hospital = await Hospital.findByIdAndUpdate(hospitalId, update, { new: true });
  if (!hospital) return next(new AppError("Hospital not found", 404));

  res.json({ success: true, message: "Hospital status updated", hospital });
});

// ================= CHECK AADHAAR =================
exports.checkAadhaar = asyncHandler(async (req, res, next) => {
  const { aadhaar } = req.body;
  if (!aadhaar) return next(new AppError("Aadhaar number is required", 400));

  const patient = await Patient.findOne({ adharcard_no: aadhaar }).populate("userId", "name email phone");
  if (!patient) {
    return res.json({ success: true, data: null, message: "No patient found" });
  }

  const user = patient.userId;
  res.json({
    success: true,
    data: {
      patientId: patient.patient_id,
      firstName: user?.name?.split(" ")[0] || "",
      lastName: user?.name?.split(" ").slice(1).join(" ") || "",
      email: user?.email || "",
      phone: patient.phone || user?.phone || "",
      dob: patient.dateOfBirth || "",
      gender: patient.gender || "",
      bloodGroup: patient.bloodGroup || "",
      aadhaar: patient.adharcard_no,
      _id: patient._id,
    },
  });
});

// ================= CREATE EMERGENCY LOG =================
exports.createEmergencyLog = asyncHandler(async (req, res, next) => {
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return next(new AppError("Hospital not found", 404));

  const { patientName, condition, assignedDoctor, status } = req.body;

  const log = {
    patientName,
    condition,
    assignedDoctor,
    status: status || "Active",
    createdAt: new Date(),
  };

  if (!hospital.emergencyLogs) hospital.emergencyLogs = [];
  hospital.emergencyLogs.push(log);
  await hospital.save();

  res.status(201).json({ success: true, data: log });
});

// ================= AI USAGE LOGS =================
exports.getAIUsageLogs = asyncHandler(async (req, res, next) => {
  const hospital = await Hospital.findById(req.params.hospitalId);
  if (!hospital) return next(new AppError("Hospital not found", 404));

  res.json({ success: true, data: hospital.emergencyAILogs || [] });
});
