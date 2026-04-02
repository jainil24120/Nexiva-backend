const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    // Link to User model for auth
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
    },

    // Doctor Details
    specialization: {
      type: String,
      index: true,
    },

    experienceYears: {
      type: Number,
      min: 0,
      max: 60,
    },

    qualifications: {
      type: [String],
      default: [],
    },

    consultationFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    licenseVerified: {
      type: Boolean,
      default: false,
    },

    licenseDocument: {
      type: String,
    },

    // Availability
    availability: [
      {
        day: {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
          required: true,
        },
        from: { type: String, required: true },
        to: { type: String, required: true },
      },
    ],

    // Profile
    profileImage: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      maxlength: 500,
    },

    address: {
      type: String,
    },

    // System Fields
    role: {
      type: String,
      default: "doctor",
      immutable: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // Optional: primary hospital (not required since doctors can work at multiple)
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      index: true,
    },

    lastLogin: {
      type: Date,
    },

    // Professional Stats
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    totalPatients: {
      type: Number,
      default: 0,
    },

    totalAppointments: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Doctor", doctorSchema);
