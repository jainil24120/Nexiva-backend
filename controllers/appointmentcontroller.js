const Appointment = require("../models/Appointment");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// Patient books appointment
exports.bookAppointment = asyncHandler(async (req, res, next) => {
  const { hospitalId, doctorId, appointmentDate, appointmentTime, reason } = req.body;

  if (!hospitalId || !doctorId || !appointmentDate || !appointmentTime) {
    return next(new AppError("All required fields must be provided", 400));
  }

  const Patient = require("../models/Patient");
  const patientProfile = await Patient.findOne({ userId: req.user._id });
  if (!patientProfile) {
    return next(new AppError("Patient profile not found", 404));
  }

  const newAppointment = await Appointment.create({
    patient: patientProfile._id,
    hospital: hospitalId,
    doctor: doctorId,
    appointmentDate,
    appointmentTime,
    reason,
    status: "Pending",
  });

  res.status(201).json({
    success: true,
    message: "Appointment booked successfully",
    data: newAppointment,
  });
});

// Patient's own appointments
exports.getMyAppointments = asyncHandler(async (req, res, next) => {
  const Patient = require("../models/Patient");
  const patientProfile = await Patient.findOne({ userId: req.user.id });
  if (!patientProfile) return next(new AppError("Patient profile not found", 404));

  const appointments = await Appointment.find({ patient: patientProfile._id })
    .populate("hospital", "name")
    .populate("doctor", "name specialization");

  res.status(200).json({ success: true, data: appointments });
});

// Hospital's appointments (only this hospital's)
exports.getHospitalAppointments = asyncHandler(async (req, res, next) => {
  const Hospital = require("../models/Hospital");
  const hospital = await Hospital.findOne({ userId: req.user.id });
  if (!hospital) return next(new AppError("Hospital profile not found", 404));

  const appointments = await Appointment.find({ hospital: hospital._id })
    .populate({
      path: "patient",
      populate: { path: "userId", select: "name email phone" },
    })
    .populate("doctor", "name specialization")
    .sort({ appointmentDate: -1 });

  res.status(200).json({ success: true, data: appointments });
});

// Update appointment status — only the hospital or assigned doctor can update
exports.updateAppointmentStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) return next(new AppError("Appointment not found", 404));

  // Hospital can only update their own appointments
  if (req.user.role === "hospital") {
    const Hospital = require("../models/Hospital");
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital || appointment.hospital.toString() !== hospital._id.toString()) {
      return next(new AppError("You can only update your own hospital's appointments", 403));
    }
  }

  // Doctor can only update appointments assigned to them
  if (req.user.role === "doctor") {
    const Doctor = require("../models/Doctor");
    const doctor = await Doctor.findOne({ userId: req.user.id });
    if (!doctor || appointment.doctor.toString() !== doctor._id.toString()) {
      return next(new AppError("You can only update your own appointments", 403));
    }
  }

  appointment.status = status;
  await appointment.save();

  res.status(200).json({
    success: true,
    message: "Status updated",
    data: appointment,
  });
});

// Doctor's own appointments
exports.getDoctorAppointments = asyncHandler(async (req, res, next) => {
  const Doctor = require("../models/Doctor");
  const doctor = await Doctor.findOne({ userId: req.user.id });
  if (!doctor) return next(new AppError("Doctor profile not found", 404));

  const appointments = await Appointment.find({ doctor: doctor._id })
    .populate({
      path: "patient",
      populate: { path: "userId", select: "name email phone" },
    })
    .populate("hospital", "name")
    .sort({ appointmentDate: -1 });

  res.json({ success: true, data: appointments });
});
