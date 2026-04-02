const mongoose = require("mongoose");

const doctorHospitalSchema = new mongoose.Schema(
  {
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },

    hospital_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    joined_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // since created_at not defined in your schema
  }
);

// ✅ Prevent duplicate doctor-hospital mapping
doctorHospitalSchema.index(
  { doctor_id: 1, hospital_id: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.DoctorHospital ||
  mongoose.model("DoctorHospital", doctorHospitalSchema);