const mongoose = require("mongoose");
const Patient = require("../models/Patient");

const emergencyAccessMiddleware = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const user = req.user; // from authMiddleware

    // ==============================
    // 1️⃣ Validate Authenticated User
    // ==============================
    if (!user || !user.id || !user.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // Allow doctor (you can add hospital if needed)
    if (!["doctor"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only doctors are allowed to access emergency data",
      });
    }

    // ==============================
    // 2️⃣ Validate Patient ID
    // ==============================
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID",
      });
    }

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // ==============================
    // 3️⃣ Multi-Tenant Safety Check
    // (Doctor can only access patient of same hospital)
    // ==============================
    if (
      user.role === "doctor" &&
      patient.hospital &&
      user.hospital &&
      patient.hospital.toString() !== user.hospital.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied - different hospital",
      });
    }

    // ==============================
    // 🚨 CASE 1: Emergency Mode Active
    // ==============================
    if (patient.isEmergencyCase === true) {

      // Log emergency access
      patient.emergencyAccessLogs.push({
        doctorId: user.id, // fixed (was user._id)
        reason: "Emergency / Surgery access",
        accessedAt: new Date(),
      });

      await patient.save();

      // Send limited safe emergency data
      req.patientData = {
        _id: patient._id,
        name: patient.name,
        bloodGroup: patient.bloodGroup,
        allergies: patient.allergies,
        chronicDiseases: patient.chronicDiseases,
        currentMedications: patient.currentMedications,
        pastSurgeries: patient.pastSurgeries,
        vitals: patient.vitals,
        emergencyContact: patient.emergencyContact,
      };

      return next();
    }

    // ==============================
    // 🛑 CASE 2: Not Emergency → Check Consent
    // ==============================
    if (!patient.consentToShareData) {
      return res.status(403).json({
        success: false,
        message: "Patient consent required to access data",
      });
    }

    // ==============================
    // ✅ CASE 3: Consent Granted
    // ==============================
    req.patientData = patient;
    return next();

  } catch (error) {
    console.error("Emergency Access Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = emergencyAccessMiddleware;