// models/hospitalDashboard.js
const mongoose = require("mongoose");

const hospitalDashboardSchema = new mongoose.Schema(
  {
    hospital_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
      unique: true,
    },
    total_patients: {
      type: Number,
      default: 0,
    },
    total_doctors: {
      type: Number,
      default: 0,
    },
    recent_appointments: [
      {
        patient_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Patient",
        },
        doctor_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Doctor",
        },
        date: { type: Date },
        status: { type: String, enum: ["pending", "confirmed", "rejected"] },
      },
    ],
    last_updated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

module.exports = mongoose.model("HospitalDashboard", hospitalDashboardSchema);