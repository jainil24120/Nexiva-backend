const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
  fileUrl: String,
  description: String,
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'uploaderModel' // Dynamic reference based on role
  },
  uploaderModel: {
    type: String,
    required: true,
    enum: ['User', 'Doctor', 'Hospital']
  }
}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);
