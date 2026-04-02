const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { grantConsent } = require("../controllers/consentcontroller");

router.post("/grant", protect, grantConsent);

module.exports = router;
