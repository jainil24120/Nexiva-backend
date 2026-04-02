const Report = require("../models/Report");
const Patient = require("../models/Patient");
const File = require("../models/file");
const Hospital = require("../models/Hospital");
const Doctor = require("../models/Doctor");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

exports.uploadReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let uploaderModel = "User";
    if (req.user.role === "doctor") uploaderModel = "Doctor";
    if (req.user.role === "hospital") uploaderModel = "Hospital";

    const patient = await Patient.findById(req.body.patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Patient can only upload to their own profile
    if (req.user.role === "patient") {
      if (patient.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: "You can only upload to your own profile" });
      }
    }

    // Doctor can only upload for patients in their assigned hospitals
    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (doctor) {
        const files = await File.find({ patient_id: patient._id });
        const DoctorHospital = require("../models/doctorhospital");
        const doctorHospitals = await DoctorHospital.find({ doctor_id: doctor._id }).distinct("hospital_id");
        const hasAccess = files.some((f) =>
          doctorHospitals.some((hId) => hId.toString() === f.hospital_id?.toString())
        );
        if (!hasAccess) {
          return res.status(403).json({ message: "You can only upload reports for your assigned patients" });
        }
      }
    }

    // Hospital can only upload for their own patients
    if (req.user.role === "hospital") {
      const hospital = await Hospital.findOne({ userId: req.user.id });
      if (hospital) {
        const file = await File.findOne({ patient_id: patient._id, hospital_id: hospital._id });
        if (!file) {
          return res.status(403).json({ message: "Patient is not registered at your hospital" });
        }
      }
    }

    const report = await Report.create({
      patientId: req.body.patientId,
      uploadedBy: req.user.id,
      uploaderModel,
      fileUrl: req.file.path,
      description: req.body.description,
    });

    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    // Patient can only view their own reports
    if (req.user.role === "patient") {
      if (patient.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Doctor can only view reports for their assigned patients
    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (doctor) {
        const DoctorHospital = require("../models/doctorhospital");
        const doctorHospitals = await DoctorHospital.find({ doctor_id: doctor._id }).distinct("hospital_id");
        const files = await File.find({ patient_id: patient._id });
        const hasAccess = files.some((f) =>
          doctorHospitals.some((hId) => hId.toString() === f.hospital_id?.toString())
        );
        if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      }
    }

    const reports = await Report.find({ patientId: req.params.patientId }).populate(
      "uploadedBy",
      "name email"
    );
    res.json({ success: true, count: reports.length, data: reports });
  } catch (err) {
    next(err);
  }
};

exports.downloadReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ message: "Report not found" });

    // Verify the requesting user has access to this report's patient
    const patient = await Patient.findById(report.patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (req.user.role === "patient") {
      if (patient.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (doctor) {
        const DoctorHospital = require("../models/doctorhospital");
        const doctorHospitals = await DoctorHospital.find({ doctor_id: doctor._id }).distinct("hospital_id");
        const files = await File.find({ patient_id: patient._id });
        const hasAccess = files.some((f) =>
          doctorHospitals.some((hId) => hId.toString() === f.hospital_id?.toString())
        );
        if (!hasAccess) return res.status(403).json({ message: "Access denied" });
      }
    }

    res.download(report.fileUrl);
  } catch (err) {
    next(err);
  }
};
