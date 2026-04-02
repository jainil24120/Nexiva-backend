const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const patientSchema = new mongoose.Schema(
{
  // 🆔 Memorable Patient ID (e.g. NXV-8K3M-2R7P)
  patient_id: {
    type: String,
    unique: true,
    index: true
  },

  // 🔗 Auth Mapping
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },

  // 📞 Contact
  phone: {
    type: String,
    required: true,
    index: true,
    trim: true
  },

  // 🪪 Aadhaar Number
  adharcard_no: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    select: false,
    match: [/^[0-9]{12}$/, "Aadhaar must be 12 digits"]
  },

  // 🖼️ Profile Picture (base64)
  avatar: {
    type: String,
    default: "",
  },

  // 🏠 Address
  address: {
    type: String,
    trim: true,
  },

  // 🩸 Medical Basics
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    required: true,
    index: true
  },

  dateOfBirth: {
    type: Date,
    required: true,
    index: true
  },

  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    index: true
  },

  allergies: [{
    name: { type: String, required: true },
    category: { type: String, enum: ["Food", "Environmental", "Medication", "Other"], default: "Other" },
    severity: { type: String, enum: ["low", "medium", "high"], default: "low" },
    symptoms: [String],
    notes: { type: String },
    dateAdded: { type: Date, default: Date.now }
  }],

  chronicDiseases: {
    type: [String],
    default: [],
    index: true
  },

  currentMedications: {
    type: [String],
    default: []
  },

  // 🆘 Emergency Contact
  emergencyContact: {
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    relation: { type: String, trim: true }
  },

  // 🚨 Emergency Case Flag
  isEmergencyCase: {
    type: Boolean,
    default: false,
    index: true
  },

  // 🚑 Emergency Access Logs
  emergencyAccessLogs: [
    {
      doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: true
      },
      reason: {
        type: String,
        required: true,
        trim: true
      },
      accessedAt: {
        type: Date,
        default: Date.now,
        immutable: true
      }
    }
  ],

  // 🧬 Physical Info
  heightCm: {
    type: Number,
    min: 0
  },

  weightKg: {
    type: Number,
    min: 0
  },

  // 🩺 Vitals
  vitals: {
    bloodPressure: String,
    heartRate: Number,
    bloodSugar: Number,
    temperature: Number
  },

  // 📄 Medical History
  pastSurgeries: {
    type: [String],
    default: []
  },

  medicalNotes: {
    type: String,
    trim: true,
    maxlength: 2000
  },

  // 📎 Reports
  reports: [
    {
      title: {
        type: String,
        required: true,
        trim: true
      },
      fileUrl: {
        type: String,
        required: true
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "reports.uploadedByModel"
      },
      uploadedByModel: {
        type: String,
        enum: ["Doctor", "Hospital"]
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // 🏥 Visit History
  visits: [
    {
      doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor"
      },
      hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hospital"
      },
      reason: {
        type: String,
        trim: true
      },
      visitedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // 🏥 Preferences
  preferredHospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hospital"
  },

  preferredDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor"
  },

  // 🔐 Privacy
  consentToShareData: {
    type: Boolean,
    default: false
  },

  // 🟢 Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }

},
{ timestamps: true }
);

//
// 🎂 Virtual Age
//
patientSchema.virtual("age").get(function () {

if (!this.dateOfBirth) return null;

const today = new Date();
const birthDate = new Date(this.dateOfBirth);

let age = today.getFullYear() - birthDate.getFullYear();

return age;

});


//
// 🔐 Hide internal fields in API
//
patientSchema.methods.toJSON = function () {

const obj = this.toObject({ virtuals: true });

delete obj.__v;
delete obj.adharcard_no;

return obj;

};

module.exports = mongoose.model("Patient", patientSchema);