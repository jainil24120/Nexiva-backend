const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["patient", "doctor", "hospital", "admin"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "approved", "rejected"],
      default: "active",
    },

    // Human-readable ID (e.g. DOC_Admin1, HOS_Apollo1, PAT-00123)
    userId: { type: String, unique: true, sparse: true },

    // Common fields
    phone: { type: String },
    avatar: { type: String },

    // Patient-specific fields
    gender: { type: String, enum: ["male", "female", "other"] },
    dateOfBirth: { type: String },
    bloodGroup: { type: String },
    aadharNumber: { type: String },

    // Doctor-specific fields
    licenseNumber: { type: String },

    // Hospital-specific fields
    hospitalUniqueId: { type: String },

    // OTP for password reset
    otp: { type: String, select: false },
    otpExpires: { type: Date, select: false },

    // File upload reference (license/verification doc)
    verificationDocument: { type: String },
  },
  { timestamps: true }
);

// Same email can register as patient, doctor, and hospital — unique per role
userSchema.index({ email: 1, role: 1 }, { unique: true });

// Password hashing
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Password compare
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Strip sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpires;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
