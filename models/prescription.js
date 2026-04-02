const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    visit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      required: true,
    },

    diagnosis_summary: {
      type: String,
      trim: true,
      default: "",
    },

    doctor_notes: {
      type: String,
      trim: true,
    },

    medicines: [
      {
        name: { type: String, trim: true },
        dosage: { type: String, trim: true },
        frequency: { type: String, trim: true },
        duration: { type: String, trim: true },
        quantity: { type: String, trim: true },
      },
    ],

    pharmacy: {
      name: { type: String, trim: true },
      gst: { type: String, trim: true },
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);