// utils/dashboardUpdater.js
const HospitalDashboard = require("../models/Hospitaldashboard");
const User = require("../models/User");
const Appointment = require("../models/visit"); // aapke visit model ka path

// Update total patients & doctors for hospital
const updateHospitalCounters = async (hospitalId) => {
  const total_patients = await User.countDocuments({ role: "patient", hospitalUniqueId: hospitalId });
  const total_doctors = await User.countDocuments({ role: "doctor", hospitalUniqueId: hospitalId });

  let dashboard = await HospitalDashboard.findOne({ hospital_id: hospitalId });
  if (!dashboard) {
    dashboard = await HospitalDashboard.create({ hospital_id: hospitalId });
  }

  dashboard.total_patients = total_patients;
  dashboard.total_doctors = total_doctors;
  dashboard.last_updated = Date.now();
  await dashboard.save();
};

// Add recent appointment
const addRecentAppointment = async (hospitalId, appointment) => {
  let dashboard = await HospitalDashboard.findOne({ hospital_id: hospitalId });
  if (!dashboard) {
    dashboard = await HospitalDashboard.create({ hospital_id: hospitalId });
  }

  dashboard.recent_appointments.unshift({
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    date: appointment.date,
    status: appointment.status,
  });

  // Keep only last 10 appointments
  if (dashboard.recent_appointments.length > 10) {
    dashboard.recent_appointments = dashboard.recent_appointments.slice(0, 10);
  }

  await dashboard.save();
};

module.exports = { updateHospitalCounters, addRecentAppointment };