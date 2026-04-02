const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
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
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

// Prevent duplicate file per patient per hospital
fileSchema.index({ patient_id: 1, hospital_id: 1 }, { unique: true });

module.exports = mongoose.model("File", fileSchema);