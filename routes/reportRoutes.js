// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../utils/fileUpload'); // multer
const roleMiddleware = require('../middleware/roleMiddleware');
const authMiddleware = require('../middleware/authMiddleware'); // 🔹 Import Auth Middleware

// Controllers
const reportController = require('../controllers/reportcontroller');

// File upload route
router.post('/upload', authMiddleware.protect, upload.single('file'), reportController.uploadReport);

// Protected route: only admin can view reports
router.get('/reports/:patientId', authMiddleware.protect, roleMiddleware(['admin', 'doctor', 'patient']), reportController.getReports);

// 🟢 Feature: Secure Download Route (Since static uploads are disabled)
router.get('/download/:reportId', 
  authMiddleware.protect, 
  roleMiddleware(['admin', 'doctor', 'patient']), 
  reportController.downloadReport
);

module.exports = router;
