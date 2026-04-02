const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const hospitalSchema = new mongoose.Schema(
  {
    // Link to User model for auth
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    hospital_id: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Hospital name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    hospital_type: {
      type: String,
    },

    registration_number: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },

    full_address: {
      type: String,
      trim: true,
    },

    location: {
      state: { type: String, trim: true },
      city: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },

    license_file_url: {
      type: String,
    },

    logo: {
      type: String,
    },

    verification_status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },

    access: {
      type: String,
      enum: ["granted", "denied"],
      default: "granted",
    },

    role: {
      type: String,
      default: "hospital",
      immutable: true,
    },

    description: {
      type: String,
      maxlength: 500,
    },

    bio: {
      type: String,
      maxlength: 1000,
    },

    departments: [
      {
        type: String,
        trim: true,
      },
    ],

    bedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isAcceptingPatients: {
      type: Boolean,
      default: true,
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,

    emergencyLogs: [
      {
        patientName: String,
        condition: String,
        assignedDoctor: String,
        status: { type: String, default: "Active" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // AI Emergency usage logs
    emergencyAILogs: [
      {
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
        doctorName: String,
        patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
        patientName: String,
        usedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Remove sensitive data when sending response
hospitalSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  return obj;
};

module.exports = mongoose.model("Hospital", hospitalSchema);
