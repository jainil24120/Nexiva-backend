const Prescription = require("../models/prescription");
const Visit = require("../models/visit");
const File = require("../models/file");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const Patient = require("../models/Patient");

// Helper: get visit IDs the current user can access
const getAccessibleVisitIds = async (user) => {
  if (user.role === "doctor") {
    const doctor = await Doctor.findOne({ userId: user.id });
    if (!doctor) return [];
    return await Visit.find({ doctor_id: doctor._id }).distinct("_id");
  }
  if (user.role === "hospital") {
    const hospital = await Hospital.findOne({ userId: user.id });
    if (!hospital) return [];
    const fileIds = await File.find({ hospital_id: hospital._id }).distinct("_id");
    return await Visit.find({ file_id: { $in: fileIds } }).distinct("_id");
  }
  if (user.role === "patient") {
    const patient = await Patient.findOne({ userId: user.id });
    if (!patient) return [];
    const fileIds = await File.find({ patient_id: patient._id }).distinct("_id");
    return await Visit.find({ file_id: { $in: fileIds } }).distinct("_id");
  }
  return [];
};

// Helper: check if user can access a specific visit
const canAccessVisit = async (user, visitId) => {
  const visitIds = await getAccessibleVisitIds(user);
  return visitIds.some((vid) => vid.toString() === visitId.toString());
};

/* CREATE PRESCRIPTION - POST /api/prescriptions
   Doctor creates for their own visits. Patient data auto-populated from visit. */
exports.createPrescription = async (req, res, next) => {
  try {
    const { visit_id, diagnosis_summary, doctor_notes, medicines, pharmacy } = req.body;

    if (!visit_id) return res.status(400).json({ message: "visit_id is required" });

    // Verify the visit exists and doctor owns it
    const visit = await Visit.findById(visit_id)
      .populate({ path: "file_id", populate: { path: "patient_id", populate: { path: "userId", select: "name" } } })
      .populate("doctor_id", "name");

    if (!visit) return res.status(404).json({ message: "Visit not found" });

    // Doctor can only create prescription for their own visits
    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (!doctor || visit.doctor_id?._id?.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: "You can only create prescriptions for your own visits" });
      }
    }

    // Hospital can only create for visits in their files
    if (req.user.role === "hospital") {
      const hospital = await Hospital.findOne({ userId: req.user.id });
      const file = visit.file_id;
      if (!hospital || file?.hospital_id?.toString() !== hospital._id.toString()) {
        return res.status(403).json({ message: "Visit does not belong to your hospital" });
      }
    }

    const prescription = await Prescription.create({
      visit_id,
      diagnosis_summary: diagnosis_summary || "",
      doctor_notes,
      medicines: medicines || [],
      pharmacy: pharmacy || {},
    });

    res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      data: prescription,
    });
  } catch (err) {
    next(err);
  }
};

/* GET ALL PRESCRIPTIONS - scoped to user's accessible visits */
exports.getAllPrescriptions = async (req, res, next) => {
  try {
    const { visit_id } = req.query;
    let filter = {};

    if (visit_id) {
      // Verify user can access this specific visit
      const allowed = await canAccessVisit(req.user, visit_id);
      if (!allowed) return res.status(403).json({ message: "Access denied" });
      filter.visit_id = visit_id;
    } else {
      // Return only prescriptions for user's accessible visits
      const visitIds = await getAccessibleVisitIds(req.user);
      filter.visit_id = { $in: visitIds };
    }

    const prescriptions = await Prescription.find(filter)
      .populate({
        path: "visit_id",
        populate: [
          { path: "doctor_id", select: "name specialization" },
          {
            path: "file_id",
            populate: [
              { path: "patient_id", populate: { path: "userId", select: "name email phone" } },
              { path: "hospital_id", select: "name location" },
            ],
          },
        ],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions,
    });
  } catch (err) {
    next(err);
  }
};

/* GET SINGLE PRESCRIPTION */
exports.getSinglePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id).populate({
      path: "visit_id",
      populate: [
        { path: "doctor_id", select: "name specialization" },
        {
          path: "file_id",
          populate: [
            { path: "patient_id", populate: { path: "userId", select: "name email phone" } },
            { path: "hospital_id", select: "name location" },
          ],
        },
      ],
    });

    if (!prescription) return res.status(404).json({ message: "Prescription not found" });

    // Verify access
    const allowed = await canAccessVisit(req.user, prescription.visit_id?._id || prescription.visit_id);
    if (!allowed) return res.status(403).json({ message: "Access denied" });

    res.status(200).json({ success: true, data: prescription });
  } catch (err) {
    next(err);
  }
};

/* UPDATE PRESCRIPTION - only the doctor who created it */
exports.updatePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id).populate("visit_id");
    if (!prescription) return res.status(404).json({ message: "Prescription not found" });

    // Only the doctor of this visit can update
    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (!doctor || prescription.visit_id?.doctor_id?.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: "You can only update your own prescriptions" });
      }
    }

    const updated = await Prescription.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Prescription updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

/* DELETE PRESCRIPTION - only the doctor who created it */
exports.deletePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id).populate("visit_id");
    if (!prescription) return res.status(404).json({ message: "Prescription not found" });

    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ userId: req.user.id });
      if (!doctor || prescription.visit_id?.doctor_id?.toString() !== doctor._id.toString()) {
        return res.status(403).json({ message: "You can only delete your own prescriptions" });
      }
    }

    await Prescription.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Prescription deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};
