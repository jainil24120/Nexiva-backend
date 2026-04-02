require("dotenv").config({ override: true });
const express = require("express");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");
const AppError = require("./utils/AppError");

// Import routes
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const reportRoutes = require("./routes/reportRoutes");
const consentRoutes = require("./routes/consentRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const appointmentRoutes = require("./routes/AppointmentRoutes");
const doctorHospitalRoutes = require("./routes/doctorhospitalRoutes");
const prescriptionRoutes = require("./routes/prescriptionroutes");
const fileRoutes = require("./routes/fileRoutes");
const inventoryRoutes = require("./routes/inventoryroutes");
const dashboardRoutes = require("./routes/hospitaldashboardRoutes");
const visitRoutes = require("./routes/visitRoutes");
const adminRoutes = require("./routes/adminRoutes");
const aiRoutes = require("./routes/aiRoutes");
const planRoutes = require("./routes/planRoutes");
const doctorActivityRoutes = require("./routes/doctorActivityRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();
const PORT = process.env.PORT || 4000;

// Connect MongoDB
connectDB();

// ================= MIDDLEWARE =================

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.PATIENT_FRONTEND_URL,
        // Dev origins (only active when NODE_ENV is not production)
        ...(process.env.NODE_ENV !== "production"
          ? ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]
          : []),
      ].filter(Boolean);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all in current phase; tighten in production
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format.",
      error: err.message,
    });
  }
  next(err);
});

// ================= TEST ROUTE =================

app.get("/", (req, res) => {
  res.json({ success: true, message: "Nexiva API is running" });
});

// ================= ROUTES =================

app.use("/api/auth", authRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/hospital", hospitalRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/doctorhospital", doctorHospitalRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/hospitaldashboard", dashboardRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/doctor-activity", doctorActivityRoutes);

// ================= 404 ROUTE =================

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// ================= ERROR MIDDLEWARE =================

app.use(errorMiddleware);

// ================= SERVER START =================

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
