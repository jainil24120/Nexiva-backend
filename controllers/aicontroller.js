const groq = require("../config/groq");
const Patient = require("../models/Patient");
const Visit = require("../models/visit");
const File = require("../models/file");
const Prescription = require("../models/prescription");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

/**
 * POST /api/ai/emergency-analysis
 * Analyse all patient data and return AI-powered emergency summary
 */
exports.getEmergencyAnalysis = asyncHandler(async (req, res, next) => {
  const { patientId, hospitalId } = req.body;

  if (!patientId) {
    return next(new AppError("patientId is required", 400));
  }
  if (!hospitalId) {
    return next(new AppError("hospitalId is required. Select a hospital first.", 400));
  }

  // Verify doctor is active at this hospital
  const doctor = await Doctor.findOne({ userId: req.user.id });
  if (!doctor) return next(new AppError("Doctor profile not found", 404));

  const DoctorHospital = require("../models/doctorhospital");
  const mapping = await DoctorHospital.findOne({
    doctor_id: doctor._id,
    hospital_id: hospitalId,
    status: "active",
  });
  if (!mapping) {
    return next(new AppError("You must be active at the selected hospital to use AI analysis", 403));
  }

  // 1. Get patient profile with full details
  const patient = await Patient.findById(patientId)
    .populate("userId", "name email phone")
    .select("+adharcard_no");

  if (!patient) {
    return next(new AppError("Patient not found", 404));
  }

  // 2. Get all files (hospital links) for this patient
  const files = await File.find({ patient_id: patientId })
    .populate("hospital_id", "name location");

  const fileIds = files.map((f) => f._id);

  // 3. Get all visits for this patient
  const visits = await Visit.find({ file_id: { $in: fileIds } })
    .populate("doctor_id", "name specialization")
    .populate({
      path: "file_id",
      populate: { path: "hospital_id", select: "name" },
    })
    .sort({ createdAt: -1 });

  // 4. Get all prescriptions linked to visits
  const visitIds = visits.map((v) => v._id);
  const prescriptions = await Prescription.find({ visit_id: { $in: visitIds } });

  // Build prescription map by visit ID
  const prescriptionMap = {};
  prescriptions.forEach((p) => {
    prescriptionMap[p.visit_id.toString()] = p;
  });

  // 5. Build comprehensive patient data summary for AI
  const patientSummary = {
    name: patient.userId?.name || "Unknown",
    age: patient.age,
    gender: patient.gender,
    bloodGroup: patient.bloodGroup,
    allergies: (patient.allergies || []).map((a) => ({
      name: a.name,
      severity: a.severity,
      category: a.category,
    })),
    chronicDiseases: patient.chronicDiseases || [],
    currentMedications: patient.currentMedications || [],
    pastSurgeries: patient.pastSurgeries || [],
    vitals: patient.vitals || {},
    height: patient.heightCm,
    weight: patient.weightKg,
    medicalNotes: patient.medicalNotes || "",
    emergencyContact: patient.emergencyContact || {},
  };

  const visitHistory = visits.map((v) => {
    const pres = prescriptionMap[v._id.toString()];
    return {
      date: v.createdAt,
      type: v.visit_type,
      hospital: v.file_id?.hospital_id?.name || "Unknown",
      doctor: v.doctor_id?.name || "Unknown",
      doctorSpecialization: v.doctor_id?.specialization || "",
      symptoms: v.symptoms || "",
      diagnosis: v.diagnosis || "",
      notes: v.notes || "",
      status: v.status,
      prescription: pres
        ? {
            diagnosis_summary: pres.diagnosis_summary,
            doctor_notes: pres.doctor_notes,
            medicines: (pres.medicines || []).map((m) => ({
              name: m.name,
              dosage: m.dosage,
              frequency: m.frequency,
              duration: m.duration,
              quantity: m.quantity,
            })),
          }
        : null,
    };
  });

  // Get reports from the Report collection
  const Report = require("../models/Report");
  const dbReports = await Report.find({ patientId })
    .populate("uploadedBy", "name")
    .sort({ createdAt: -1 });

  const reports = dbReports.map((r) => {
    // Extract meaningful name from description or filename
    const filename = r.fileUrl ? r.fileUrl.split(/[/\\]/).pop() : "";
    return {
      title: r.description || filename || "Untitled Report",
      uploadedAt: r.createdAt,
      uploadedBy: r.uploadedBy?.name || r.uploaderModel || "Unknown",
    };
  });

  // 6. Limit to last 3 visits only
  const recentVisits = visitHistory.slice(0, 3);

  // 7. Create prompt for Groq AI
  const prompt = `You are an emergency medical AI assistant for doctors. This is a CRITICAL emergency assessment. Focus ONLY on major, life-threatening, or clinically significant findings. Ignore minor issues like common cold, mild headache, or routine checkups.

PATIENT DATA:
${JSON.stringify(patientSummary, null, 2)}

LAST ${recentVisits.length} VISITS (newest first):
${JSON.stringify(recentVisits, null, 2)}

MEDICAL REPORTS (${reports.length} reports — THESE ARE CRITICAL, treat report titles as confirmed diagnostic findings):
${reports.length > 0 ? JSON.stringify(reports, null, 2) : "None on file"}

CRITICAL INSTRUCTIONS:
- Report titles like "Dengue Positive", "COVID Positive", "TB Report", "Cancer Biopsy" etc. are CONFIRMED LAB RESULTS. Highlight them prominently with ⚠️ warnings.
- ONLY focus on serious/major conditions: infections (dengue, malaria, TB, COVID), chronic diseases, surgeries, severe allergies, critical vitals, dangerous drug interactions.
- SKIP minor issues: common cold, mild fever, routine headache, general checkup, vitamin supplements.
- Keep it SHORT and ACTIONABLE.

Provide ONLY these sections:
1. **⚠️ CRITICAL ALERTS**: Major findings from reports (e.g., Dengue Positive, abnormal labs), dangerous allergies, life-threatening drug interactions. This is the MOST IMPORTANT section.
2. **Patient Overview**: One-line summary (age, gender, blood group, major conditions ONLY)
3. **Last 3 Visits**: For each — date, major symptoms/diagnosis, key medicines. Skip if visit was for minor issue.
4. **Active Medications & Interactions**: Current medicines with any dangerous interactions ONLY.
5. **Immediate Actions**: What the emergency doctor must do RIGHT NOW based on the critical alerts and reports.

Be direct. Be clinical. No filler. This is for an emergency doctor who needs answers in 30 seconds.`;

  // 8. Call Groq API (using free-tier model)
  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.1-8b-instant",
    temperature: 0.2,
    max_tokens: 1500,
  });

  const analysis = chatCompletion.choices[0]?.message?.content || "Analysis unavailable.";

  // Log AI usage for hospital emergency section
  const hospital = await Hospital.findById(hospitalId);
  if (hospital) {
    if (!hospital.emergencyAILogs) hospital.emergencyAILogs = [];
    hospital.emergencyAILogs.push({
      doctorId: doctor._id,
      doctorName: doctor.name,
      patientId: patient._id,
      patientName: patient.userId?.name || "Unknown",
      usedAt: new Date(),
    });
    await hospital.save();
  }

  res.json({
    success: true,
    data: {
      patient: patientSummary,
      visitCount: visits.length,
      prescriptionCount: prescriptions.length,
      analysis,
    },
  });
});
