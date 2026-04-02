const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads'); // 🔹 Fix: Use absolute path
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true }); // 🔹 Fix: Create parent dirs if needed
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 🟢 Security: Add random suffix to prevent filename guessing
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
});

function checkFileType(file, cb) {
  // 🔹 Fix: Strict Regex (Start ^ and End $) to prevent partial matches like .dockerfile
  const filetypes = /^(jpeg|jpg|png|pdf|doc|docx)$/;
  // 🟢 Fix: Proper MIME type regex
  const mimetypes = /jpeg|jpg|png|pdf|msword|wordprocessingml/;

  const extname = filetypes.test(path.extname(file.originalname).toLowerCase().replace('.', ''));
  const mimetype = mimetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Images and Documents Only!'));
  }
}

module.exports = upload;