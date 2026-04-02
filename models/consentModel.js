const mongoose = require("mongoose");

const consentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  consent: {
    type: Boolean,
    required: true,
  },
});

module.exports = mongoose.model("Consent", consentSchema);
