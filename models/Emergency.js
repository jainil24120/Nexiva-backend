// Re-export the Patient model to maintain backward compatibility
// The Patient model in Patient.js already includes emergency fields
// (isEmergencyCase, emergencyAccessLogs, vitals, etc.)
module.exports = require("./Patient");
