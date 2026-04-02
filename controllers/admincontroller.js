const User = require("../models/user");
const Hospital = require("../models/Hospital");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const DoctorHospital = require("../models/doctorhospital");
const Subscription = require("../models/Subscription");
const File = require("../models/file");
const asyncHandler = require("../utils/asyncHandler");

// GET /api/admin/stats
exports.getStats = asyncHandler(async (req, res) => {
  const [totalPatients, totalDoctors, totalHospitals, pendingRequests] = await Promise.all([
    User.countDocuments({ role: "patient" }),
    User.countDocuments({ role: "doctor" }),
    User.countDocuments({ role: "hospital" }),
    User.countDocuments({ role: "hospital", status: "pending" }),
  ]);

  const activeHospitals = await Hospital.countDocuments({ status: "active" });
  const totalSubscriptions = await Subscription.countDocuments({ isActive: true });

  // Revenue from subscriptions
  const subscriptions = await Subscription.find({ paymentStatus: "paid" });
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.price || 0), 0);

  res.json({
    success: true,
    data: {
      totalPatients,
      totalDoctors,
      totalHospitals,
      activeHospitals,
      pendingRequests,
      totalSubscriptions,
      totalRevenue,
    },
  });
});

// GET /api/admin/doctors
exports.getAllDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find().populate("userId", "name email status userId phone createdAt");

  // Get hospital mappings for each doctor
  const doctorsWithHospitals = await Promise.all(
    doctors.map(async (doc) => {
      const mappings = await DoctorHospital.find({ doctor_id: doc._id, status: "active" })
        .populate("hospital_id", "name location");
      return {
        ...doc.toObject(),
        hospitals: mappings.map((m) => m.hospital_id).filter(Boolean),
      };
    })
  );

  res.json({ success: true, data: doctorsWithHospitals });
});

// GET /api/admin/patients
exports.getAllPatients = asyncHandler(async (req, res) => {
  const patients = await Patient.find().populate("userId", "name email status userId phone createdAt");

  // Get hospital associations via File model
  const patientsWithHospitals = await Promise.all(
    patients.map(async (pat) => {
      const files = await File.find({ patient_id: pat._id })
        .populate("hospital_id", "name location");
      return {
        ...pat.toObject(),
        hospitals: files.map((f) => f.hospital_id).filter(Boolean),
      };
    })
  );

  res.json({ success: true, data: patientsWithHospitals });
});

// GET /api/admin/revenue
exports.getRevenue = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find({ paymentStatus: "paid" })
    .populate("ownerId", "name email")
    .sort({ createdAt: -1 });

  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.price || 0), 0);

  const planBreakdown = {};
  subscriptions.forEach((s) => {
    planBreakdown[s.plan] = (planBreakdown[s.plan] || 0) + 1;
  });

  res.json({
    success: true,
    data: {
      totalRevenue,
      totalSales: subscriptions.length,
      planBreakdown,
      recentSales: subscriptions.slice(0, 20),
    },
  });
});
