const mongoose = require("mongoose");

const doctorActivitySchema = new mongoose.Schema(
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
    // When the doctor went active
    activeAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // When they went inactive (null = still active)
    inactiveAt: {
      type: Date,
      default: null,
    },
    // Duration in minutes (calculated on deactivation)
    durationMinutes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for fast lookups by hospital + date range
doctorActivitySchema.index({ hospital_id: 1, activeAt: -1 });
doctorActivitySchema.index({ doctor_id: 1, hospital_id: 1, activeAt: -1 });

module.exports =
  mongoose.models.DoctorActivity ||
  mongoose.model("DoctorActivity", doctorActivitySchema);
