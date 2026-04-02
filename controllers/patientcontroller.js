const Patient = require("../models/Patient");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");  
const mongoose = require("mongoose"); 

const allowedPatientFields = [
  "gender",
  "dateOfBirth",
  "bloodGroup",
  "allergies",
  "chronicDiseases",
  "currentMedications",
  "heightCm",
  "weightKg",
  "pastSurgeries",
  "medicalNotes",
  "emergencyContact",
  "preferredHospital",
  "preferredDoctor",
  "consentToShareData",
  "adharcard_no",
  "adharImage",
  "address",
  "phone",
  "avatar"
];

// ================= CREATE PATIENT PROFILE =================
exports.createPatientProfile = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "patient") return next(new AppError("Only patients can create profile", 403));

  const existingProfile = await Patient.findOne({ userId: req.user.id });
  if (existingProfile) return next(new AppError("Patient profile already exists", 400));

  const filteredData = {};
  allowedPatientFields.forEach(field => {
    if (req.body[field] !== undefined) filteredData[field] = req.body[field];
  });

  if (!filteredData.phone || !filteredData.dateOfBirth || !filteredData.gender || !filteredData.adharcard_no) {
    return next(new AppError("phone, dateOfBirth, gender, and adharcard_no are required", 400));
  }

  if (filteredData.preferredHospital) {
    if (!mongoose.Types.ObjectId.isValid(filteredData.preferredHospital)) return next(new AppError("Invalid Hospital ID", 400));
    filteredData.preferredHospital = new mongoose.Types.ObjectId(filteredData.preferredHospital);
  }
  if (filteredData.preferredDoctor) {
    if (!mongoose.Types.ObjectId.isValid(filteredData.preferredDoctor)) return next(new AppError("Invalid Doctor ID", 400));
    filteredData.preferredDoctor = new mongoose.Types.ObjectId(filteredData.preferredDoctor);
  }

  const profile = await Patient.create({ userId: req.user.id, ...filteredData });

  res.status(201).json({ success: true, message: "Profile created successfully", data: profile });
});

// ================= GET OWN PROFILE =================
exports.getPatientProfile = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "patient") return next(new AppError("Only patients can access their profile", 403));

  const profile = await Patient.findOne({ userId: req.user.id })
    .populate("preferredDoctor")
    .populate("preferredHospital");

  if (!profile) return next(new AppError("Profile not found", 404));

  res.json({ success: true, data: profile });
});

// ================= UPDATE OWN PROFILE =================
exports.updatePatientProfile = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "patient") return next(new AppError("Only patients can update their profile", 403));

  const patient = await Patient.findOne({ userId: req.user.id });
  if (!patient) return next(new AppError("Profile not found", 404));

  allowedPatientFields.forEach(field => {
    if (req.body[field] !== undefined) {
      if ((field === "preferredHospital" || field === "preferredDoctor") && req.body[field]) {
        if (!mongoose.Types.ObjectId.isValid(req.body[field])) throw new AppError(`Invalid ${field} ID`, 400);
        patient[field] = new mongoose.Types.ObjectId(req.body[field]);
      } else {
        patient[field] = req.body[field];
      }
    }
  });

  await patient.save();

  res.json({ success: true, message: "Profile updated successfully", data: patient });
});

// ================= GET ALL PATIENTS (scoped to hospital's own patients) =================
exports.getAllPatients = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "hospital") return next(new AppError("Only hospitals can access all patients", 403));

  // Find this hospital, then find patient files linked to it
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return next(new AppError("Hospital not found", 404));

  const files = await File.find({ hospital_id: hospital._id }).distinct("patient_id");

  const patients = await Patient.find({ _id: { $in: files } }).populate("userId", "name email phone");

  res.json({ success: true, count: patients.length, data: patients });
});

// ================= GET PATIENT BY ID =================
exports.getPatientById = asyncHandler(async (req, res, next) => {
  if (!["hospital","doctor"].includes(req.user.role)) return next(new AppError("Access denied", 403));

  const patient = await Patient.findById(req.params.patientId)
    .populate("preferredDoctor")
    .populate("preferredHospital");

  if (!patient) return next(new AppError("Patient not found", 404));

  if (req.user.role === "doctor" && !patient.consentToShareData && !patient.isEmergencyCase) {
    return next(new AppError("Patient consent required", 403));
  }

  res.json({ success: true, data: patient });
});

// ================= PATIENT REPORTS =================
exports.uploadPatientReport = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "doctor") return next(new AppError("Only doctors can upload reports", 403));

  const { title, fileUrl } = req.body;
  const patient = await Patient.findById(req.params.patientId);
  if (!patient) return next(new AppError("Patient not found", 404));

  patient.reports.push({ title, fileUrl, uploadedBy: req.user.id });
  await patient.save();

  res.json({ success: true, message: "Report uploaded" });
});

exports.getPatientReports = asyncHandler(async (req, res, next) => {
  if (!["hospital","doctor"].includes(req.user.role)) return next(new AppError("Access denied", 403));

  const patient = await Patient.findById(req.params.patientId).select("reports");
  if (!patient) return next(new AppError("Patient not found", 404));

  res.json({ success: true, data: patient.reports });
});

// ================= SEARCH PATIENT =================
exports.searchPatient = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "hospital") return next(new AppError("Only hospitals can search patients", 403));

  const { phone, patient_id } = req.query;
  const query = {};
  if (phone) query.phone = phone;
  if (patient_id) query.patient_id = patient_id;

  const patients = await Patient.find(query).populate("userId", "name email");

  res.json({ success: true, count: patients.length, data: patients });
});

// ================= EMERGENCY DATA =================
exports.getEmergencyPatientData = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "doctor") return next(new AppError("Only doctors can access emergency data", 403));

  const patient = await Patient.findById(req.params.patientId).populate("userId", "name email phone");
  if (!patient) return next(new AppError("Patient not found", 404));

  patient.emergencyAccessLogs.push({
    doctorId: req.user.id,
    reason: req.body.reason || req.query.reason || "Emergency Access",
    accessedAt: new Date()
  });
  await patient.save();

  res.json({ success: true, data: patient });
});

// ================= TOGGLE EMERGENCY STATUS =================
exports.toggleEmergencyStatus = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "hospital") return next(new AppError("Only hospitals can toggle emergency status", 403));

  const patient = await Patient.findById(req.params.patientId);
  if (!patient) return next(new AppError("Patient not found", 404));

  patient.isEmergencyCase = !patient.isEmergencyCase;
  await patient.save();

  res.json({ success: true, message: `Emergency status updated to: ${patient.isEmergencyCase}`, data: patient });
});

// ================= GET PATIENT VISITS =================
exports.getPatientVisits = asyncHandler(async (req, res, next) => {
  if (!["hospital","doctor"].includes(req.user.role)) return next(new AppError("Access denied", 403));

  const patient = await Patient.findById(req.params.patientId)
    .select("visits")
    .populate("visits.doctorId")
    .populate("visits.hospitalId");

  if (!patient) return next(new AppError("Patient not found", 404));

  res.json({ success: true, data: patient.visits });
});

// ================= PATIENT ALLERGIES CRUD =================

const File = require("../models/file");
const Visit = require("../models/visit");
const Hospital = require("../models/Hospital");
const Report = require("../models/Report");

exports.getMyAllergies = asyncHandler(async (req, res, next) => {
  const patient = await Patient.findOne({ userId: req.user.id }).select("allergies");
  if (!patient) return next(new AppError("Patient profile not found", 404));
  res.json({ success: true, data: patient.allergies });
});

exports.addAllergy = asyncHandler(async (req, res, next) => {
  const { name, category, severity, symptoms, notes } = req.body;
  if (!name) return next(new AppError("Allergy name is required", 400));

  const patient = await Patient.findOne({ userId: req.user.id });
  if (!patient) return next(new AppError("Patient profile not found", 404));

  const allergy = { name, category, severity, symptoms, notes, dateAdded: new Date() };
  patient.allergies.push(allergy);
  await patient.save();

  const added = patient.allergies[patient.allergies.length - 1];
  res.status(201).json({ success: true, data: added });
});

exports.updateAllergy = asyncHandler(async (req, res, next) => {
  const { allergyId } = req.params;
  const patient = await Patient.findOne({ userId: req.user.id });
  if (!patient) return next(new AppError("Patient profile not found", 404));

  const allergy = patient.allergies.id(allergyId);
  if (!allergy) return next(new AppError("Allergy not found", 404));

  if (req.body.name) allergy.name = req.body.name;
  if (req.body.category) allergy.category = req.body.category;
  if (req.body.severity) allergy.severity = req.body.severity;
  if (req.body.symptoms) allergy.symptoms = req.body.symptoms;
  if (req.body.notes !== undefined) allergy.notes = req.body.notes;

  await patient.save();
  res.json({ success: true, data: allergy });
});

exports.deleteAllergy = asyncHandler(async (req, res, next) => {
  const { allergyId } = req.params;
  const patient = await Patient.findOne({ userId: req.user.id });
  if (!patient) return next(new AppError("Patient profile not found", 404));

  const allergy = patient.allergies.id(allergyId);
  if (!allergy) return next(new AppError("Allergy not found", 404));

  patient.allergies.pull(allergyId);
  await patient.save();
  res.json({ success: true, message: "Allergy deleted" });
});

// ================= PATIENT MY-HOSPITALS =================

exports.getMyHospitals = asyncHandler(async (req, res, next) => {
  const patient = await Patient.findOne({ userId: req.user.id });
  if (!patient) return next(new AppError("Patient profile not found", 404));

  const files = await File.find({ patient_id: patient._id, status: "active" })
    .populate("hospital_id");

  const hospitals = files
    .filter(f => f.hospital_id)
    .map(f => ({
      id: f.hospital_id._id,
      name: f.hospital_id.name,
      location: f.hospital_id.location,
      fileId: f._id,
    }));

  res.json({ success: true, data: hospitals });
});

// ================= PATIENT MY-VISITS =================

exports.getMyVisits = asyncHandler(async (req, res, next) => {
  const patient = await Patient.findOne({ userId: req.user.id });
  if (!patient) return next(new AppError("Patient profile not found", 404));

  const files = await File.find({ patient_id: patient._id });
  const fileIds = files.map(f => f._id);

  const visits = await Visit.find({ file_id: { $in: fileIds } })
    .populate("doctor_id", "name specialization")
    .populate({ path: "file_id", populate: { path: "hospital_id", select: "name location" } })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: visits });
});

// ================= PATIENT MY-REPORTS =================

exports.getMyReports = asyncHandler(async (req, res, next) => {
  const patient = await Patient.findOne({ userId: req.user.id });
  if (!patient) return next(new AppError("Patient profile not found", 404));

  const reports = await Report.find({ patientId: patient._id })
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 });

  res.json({ success: true, data: reports });
});

// ================= EMERGENCY PATIENT LOOKUP (Doctor) =================
exports.emergencyLookup = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "doctor") return next(new AppError("Only doctors can use emergency lookup", 403));

  const { q } = req.query; // search query: aadhaar, patient_id, or phone
  if (!q || q.trim().length < 3) return next(new AppError("Search query (min 3 chars) is required", 400));

  const query = q.trim();

  // Search by patient_id, phone, or aadhaar
  let patient = await Patient.findOne({ patient_id: query })
    .select("+adharcard_no")
    .populate("userId", "name email phone");

  if (!patient) {
    patient = await Patient.findOne({ phone: query })
      .select("+adharcard_no")
      .populate("userId", "name email phone");
  }

  if (!patient) {
    patient = await Patient.findOne({ adharcard_no: query })
      .select("+adharcard_no")
      .populate("userId", "name email phone");
  }

  // Also try searching by User.userId (the NXV-XXXX-XXXX ID)
  if (!patient) {
    const User = require("../models/user");
    const user = await User.findOne({ userId: query, role: "patient" });
    if (user) {
      patient = await Patient.findOne({ userId: user._id })
        .select("+adharcard_no")
        .populate("userId", "name email phone");
    }
  }

  if (!patient) {
    return res.json({ success: true, data: null, message: "No patient found" });
  }

  // Fetch full medical data
  const [visits, reports, prescriptions] = await Promise.all([
    Visit.find({ file_id: { $in: await File.find({ patient_id: patient._id }).distinct("_id") } })
      .populate("doctor_id", "name specialization")
      .populate({ path: "file_id", populate: { path: "hospital_id", select: "name" } })
      .sort({ createdAt: -1 })
      .limit(20),
    Report.find({ patientId: patient._id }).sort({ createdAt: -1 }).limit(10),
    require("../models/prescription").find({
      visit_id: { $in: await Visit.find({ file_id: { $in: await File.find({ patient_id: patient._id }).distinct("_id") } }).distinct("_id") }
    }).sort({ createdAt: -1 }).limit(10),
  ]);

  // Log emergency access
  patient.emergencyAccessLogs.push({
    doctorId: req.user.id,
    reason: req.query.reason || "Emergency Lookup",
    accessedAt: new Date(),
  });
  await patient.save({ validateBeforeSave: false });

  res.json({
    success: true,
    data: {
      patient: {
        _id: patient._id,
        patient_id: patient.patient_id,
        name: patient.userId?.name || "",
        email: patient.userId?.email || "",
        phone: patient.phone || patient.userId?.phone || "",
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies || [],
        chronicDiseases: patient.chronicDiseases || [],
        currentMedications: patient.currentMedications || [],
        heightCm: patient.heightCm,
        weightKg: patient.weightKg,
        address: patient.address || "",
        emergencyContact: patient.emergencyContact || {},
        vitals: patient.vitals || {},
      },
      visits: visits.map(v => ({
        _id: v._id,
        date: v.createdAt,
        visitType: v.visit_type,
        symptoms: v.symptoms,
        diagnosis: v.diagnosis,
        notes: v.notes,
        status: v.status,
        doctor: v.doctor_id?.name || "",
        hospital: v.file_id?.hospital_id?.name || "",
      })),
      reports: reports.map(r => ({
        _id: r._id,
        description: r.description || (r.fileUrl ? r.fileUrl.split(/[/\\]/).pop() : "Report"),
        fileUrl: r.fileUrl,
        date: r.createdAt,
      })),
      prescriptions: prescriptions.map(p => ({
        _id: p._id,
        diagnosis: p.diagnosis_summary,
        notes: p.doctor_notes,
        date: p.createdAt,
      })),
    },
  });
});