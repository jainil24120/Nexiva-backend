const DoctorHospital = require("../models/doctorhospital");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");
const Subscription = require("../models/Subscription");

const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");


/* =====================================================
   ✅ ASSIGN DOCTOR TO HOSPITAL (ADMIN)
===================================================== */
exports.assignDoctorToHospital = asyncHandler(async (req, res, next) => {

  const { doctor_id, hospital_id } = req.body;

  if (!doctor_id || !hospital_id) {
    return next(new AppError("doctor_id and hospital_id are required", 400));
  }

  // 1️⃣ Check doctor exists
  const doctor = await Doctor.findById(doctor_id);

  if (!doctor || doctor.status !== "active") {
    return next(new AppError("Active doctor not found", 404));
  }

  // 2️⃣ Check hospital exists
  const hospital = await Hospital.findById(hospital_id);

  if (!hospital || hospital.status !== "active") {
    return next(new AppError("Active hospital not found", 404));
  }

  // 3️⃣ Check subscription
  const subscription = await Subscription.findOne({
    ownerId: hospital_id,
    ownerModel: "Hospital",
    isActive: true,
    endDate: { $gte: new Date() },
    paymentStatus: "paid",
  });

  if (!subscription) {
    return next(new AppError("Hospital subscription not active", 403));
  }

  // 4️⃣ Prevent duplicate
  const existing = await DoctorHospital.findOne({
    doctor_id,
    hospital_id,
  });

  if (existing) {
    return next(new AppError("Doctor already assigned to this hospital", 400));
  }

  // 5️⃣ Create mapping
  const mapping = await DoctorHospital.create({
    doctor_id,
    hospital_id,
    status: "active",
  });

  res.status(201).json({
    success: true,
    message: "Doctor assigned to hospital successfully",
    data: mapping,
  });

});


/* =====================================================
   ✅ UPDATE MAPPING STATUS
===================================================== */
exports.updateDoctorHospitalStatus = asyncHandler(async (req, res, next) => {

  const { doctor_id, hospital_id, status } = req.body;

  if (!doctor_id || !hospital_id || !status) {
    return next(new AppError("doctor_id, hospital_id and status are required", 400));
  }

  const mapping = await DoctorHospital.findOneAndUpdate(
    { doctor_id, hospital_id },
    { status },
    { new: true }
  );

  if (!mapping) {
    return next(new AppError("Mapping not found", 404));
  }

  res.json({
    success: true,
    message: "Mapping status updated",
    data: mapping,
  });

});


/* =====================================================
   ✅ REMOVE DOCTOR FROM HOSPITAL
===================================================== */
exports.removeDoctorFromHospital = asyncHandler(async (req, res, next) => {

  const { doctor_id, hospital_id } = req.body;

  const mapping = await DoctorHospital.findOneAndDelete({
    doctor_id,
    hospital_id,
  });

  if (!mapping) {
    return next(new AppError("Mapping not found", 404));
  }

  res.json({
    success: true,
    message: "Doctor removed from hospital",
  });

});


/* =====================================================
   ✅ GET MY HOSPITALS
===================================================== */
exports.getMyHospitals = asyncHandler(async (req, res, next) => {

  // Look up doctor profile from user ID
  const Doctor = require("../models/Doctor");
  const doctor = await Doctor.findOne({ userId: req.user.id });
  const doctorId = doctor ? doctor._id : req.user.id;

  const hospitals = await DoctorHospital.find({
    doctor_id: doctorId,
    status: "active",
  }).populate("hospital_id");

  res.json({
    success: true,
    count: hospitals.length,
    data: hospitals,
  });

});


/* =====================================================
   ✅ GET DOCTORS BY HOSPITAL
===================================================== */
exports.getDoctorsByHospital = asyncHandler(async (req, res, next) => {

  const { hospitalId } = req.params;

  const doctors = await DoctorHospital.find({
    hospital_id: hospitalId,
    status: "active",
  }).populate("doctor_id", "name email phone doctor_type");

  res.json({
    success: true,
    count: doctors.length,
    data: doctors,
  });

});