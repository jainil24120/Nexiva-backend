const DoctorActivity = require("../models/DoctorActivity");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// ── Doctor goes ACTIVE at a hospital ──
exports.goActive = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ userId: req.user.id });
  if (!doctor) return next(new AppError("Doctor profile not found", 404));

  const { hospitalId } = req.body;
  if (!hospitalId) return next(new AppError("hospitalId is required", 400));

  // Close any existing open session for this doctor at this hospital
  await DoctorActivity.updateMany(
    { doctor_id: doctor._id, hospital_id: hospitalId, inactiveAt: null },
    {
      $set: {
        inactiveAt: new Date(),
        durationMinutes: 0, // will be recalculated below
      },
    }
  );

  // Recalculate durations for sessions just closed
  const justClosed = await DoctorActivity.find({
    doctor_id: doctor._id,
    hospital_id: hospitalId,
    durationMinutes: 0,
    inactiveAt: { $ne: null },
  });
  for (const session of justClosed) {
    session.durationMinutes = Math.round(
      (session.inactiveAt - session.activeAt) / 60000
    );
    await session.save();
  }

  // Create new active session
  const activity = await DoctorActivity.create({
    doctor_id: doctor._id,
    hospital_id: hospitalId,
    activeAt: new Date(),
  });

  res.status(201).json({ success: true, data: activity });
});

// ── Doctor goes INACTIVE ──
exports.goInactive = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ userId: req.user.id });
  if (!doctor) return next(new AppError("Doctor profile not found", 404));

  const { hospitalId } = req.body;
  if (!hospitalId) return next(new AppError("hospitalId is required", 400));

  // Find and close open session
  const session = await DoctorActivity.findOne({
    doctor_id: doctor._id,
    hospital_id: hospitalId,
    inactiveAt: null,
  });

  if (!session) {
    return res.json({ success: true, message: "No active session found" });
  }

  session.inactiveAt = new Date();
  session.durationMinutes = Math.round(
    (session.inactiveAt - session.activeAt) / 60000
  );
  await session.save();

  res.json({ success: true, data: session });
});

// ── Hospital: Get activity calendar for a month ──
// GET /api/doctor-activity/calendar?month=2026-03&hospitalId=xxx
exports.getCalendar = asyncHandler(async (req, res, next) => {
  let hospitalId = req.query.hospitalId;

  // If hospital role, use their own hospital
  if (req.user.role === "hospital") {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) return next(new AppError("Hospital not found", 404));
    hospitalId = hospital._id;
  }

  if (!hospitalId) return next(new AppError("hospitalId is required", 400));

  const month = req.query.month; // "2026-03"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return next(new AppError("month query param required (YYYY-MM)", 400));
  }

  const [year, mon] = month.split("-").map(Number);
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 1); // first day of next month

  const activities = await DoctorActivity.find({
    hospital_id: hospitalId,
    activeAt: { $gte: startDate, $lt: endDate },
  })
    .populate("doctor_id", "name specialization")
    .sort({ activeAt: -1 });

  // Build calendar: { "2026-03-15": [ { doctorName, activeAt, inactiveAt, duration } ] }
  const calendar = {};
  const doctorSet = {};

  activities.forEach((a) => {
    const dateKey = a.activeAt.toISOString().split("T")[0];
    if (!calendar[dateKey]) calendar[dateKey] = [];

    const doctorName = a.doctor_id?.name || "Unknown";
    const doctorId = a.doctor_id?._id?.toString() || "";

    calendar[dateKey].push({
      doctorId,
      doctorName,
      specialization: a.doctor_id?.specialization || "",
      activeAt: a.activeAt,
      inactiveAt: a.inactiveAt,
      durationMinutes: a.durationMinutes,
      isStillActive: !a.inactiveAt,
    });

    if (!doctorSet[doctorId]) {
      doctorSet[doctorId] = {
        name: doctorName,
        specialization: a.doctor_id?.specialization || "",
      };
    }
  });

  res.json({
    success: true,
    month,
    doctors: Object.entries(doctorSet).map(([id, d]) => ({ _id: id, ...d })),
    calendar,
  });
});

// ── Hospital: Get currently active doctors ──
exports.getActiveDoctors = asyncHandler(async (req, res, next) => {
  let hospitalId;

  if (req.user.role === "hospital") {
    const hospital = await Hospital.findOne({ userId: req.user.id });
    if (!hospital) return next(new AppError("Hospital not found", 404));
    hospitalId = hospital._id;
  } else {
    hospitalId = req.query.hospitalId;
  }

  if (!hospitalId) return next(new AppError("hospitalId required", 400));

  const activeSessions = await DoctorActivity.find({
    hospital_id: hospitalId,
    inactiveAt: null,
  }).populate("doctor_id", "name specialization");

  res.json({
    success: true,
    count: activeSessions.length,
    data: activeSessions.map((s) => ({
      doctorId: s.doctor_id?._id,
      doctorName: s.doctor_id?.name || "Unknown",
      specialization: s.doctor_id?.specialization || "",
      activeAt: s.activeAt,
      activeSince: Math.round((new Date() - s.activeAt) / 60000) + " min",
    })),
  });
});
