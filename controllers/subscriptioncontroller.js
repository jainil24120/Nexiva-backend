const crypto = require("crypto");
const Subscription = require("../models/Subscription");
const Hospital = require("../models/Hospital");
const Doctor = require("../models/Doctor");
const Plan = require("../models/Plan");
const razorpay = require("../config/razorpay");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");    

/**
 * =====================================
 * GET MY SUBSCRIPTION
 * =====================================
 */
exports.getMySubscription = async (req, res,next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const ownerModel = userRole === "doctor" ? "Doctor" : "Hospital";

    // Resolve actual profile ID
    let ownerId;
    if (ownerModel === "Hospital") {
      const hospital = await Hospital.findOne({ userId });
      ownerId = hospital ? hospital._id : userId;
    } else {
      const doctor = await Doctor.findOne({ userId });
      ownerId = doctor ? doctor._id : userId;
    }

    const subscription = await Subscription.findOne({
      ownerId,
      ownerModel,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }

    res.status(200).json({
      success: true,
      subscription
    });

  } catch (err) {
  next(err)
}
};


/**
 * =====================================
 * UPGRADE SUBSCRIPTION
 * =====================================
 */
exports.upgradeSubscription = async (req, res,next) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const validPlans = ["FREE", "BASIC", "PRO", "ENTERPRISE"];

    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan"
      });
    }

    let days = 0;
    if (plan === "BASIC") days = 30;
    if (plan === "PRO") days = 365;
    if (plan === "ENTERPRISE") days = 365;

    const ownerModel = userRole === "doctor" ? "Doctor" : "Hospital";
    let ownerId;
    if (ownerModel === "Hospital") {
      const hospital = await Hospital.findOne({ userId });
      ownerId = hospital ? hospital._id : userId;
    } else {
      const doctor = await Doctor.findOne({ userId });
      ownerId = doctor ? doctor._id : userId;
    }

    const subscription = await Subscription.findOne({
      ownerId,
      ownerModel,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }

    subscription.plan = plan;
    subscription.isActive = true;
    subscription.paymentStatus = "paid";
    subscription.startDate = new Date();
    subscription.endDate = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000
    );

    await subscription.save();

    res.status(200).json({
      success: true,
      message: "Subscription upgraded successfully",
      subscription
    });

  } catch (err) {
  next(err)
}
};


/**
 * =====================================
 * CREATE RAZORPAY ORDER
 * =====================================
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Fetch plan from database
    const planDoc = await Plan.findById(planId);
    if (!planDoc || planDoc.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive plan.",
      });
    }

    const amountInPaise = planDoc.price * 100;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `sub_${Date.now()}`,
      notes: {
        plan: planDoc.name,
        planId: String(planDoc._id),
        userId: String(userId),
        userRole: String(userRole),
      },
    });

    res.status(200).json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay order error:", err.message || err);
    next(err);
  }
};


/**
 * =====================================
 * VERIFY RAZORPAY PAYMENT & ACTIVATE SUBSCRIPTION
 * =====================================
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
    } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
    }

    // Fetch plan from database
    const planDoc = await Plan.findById(planId);
    if (!planDoc) {
      return res.status(400).json({
        success: false,
        message: "Plan not found",
      });
    }

    const ownerModel = userRole === "doctor" ? "Doctor" : "Hospital";
    const startDate = new Date();
    const endDate = new Date(Date.now() + planDoc.duration * 24 * 60 * 60 * 1000);

    // Resolve the actual Hospital/Doctor document ID from User ID
    let ownerId;
    if (ownerModel === "Hospital") {
      const hospital = await Hospital.findOne({ userId });
      if (!hospital) return res.status(404).json({ success: false, message: "Hospital profile not found" });
      ownerId = hospital._id;
    } else {
      const doctor = await Doctor.findOne({ userId });
      if (!doctor) return res.status(404).json({ success: false, message: "Doctor profile not found" });
      ownerId = doctor._id;
    }

    // Upsert subscription
    let subscription = await Subscription.findOne({
      ownerId,
      ownerModel,
    });

    if (subscription) {
      subscription.plan = planDoc.name.toUpperCase();
      subscription.price = planDoc.price;
      subscription.isActive = true;
      subscription.paymentStatus = "paid";
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.razorpayOrderId = razorpay_order_id;
      subscription.razorpayPaymentId = razorpay_payment_id;
      subscription.razorpaySignature = razorpay_signature;
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        ownerId,
        ownerModel,
        plan: planDoc.name.toUpperCase(),
        price: planDoc.price,
        isActive: true,
        paymentStatus: "paid",
        startDate,
        endDate,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment verified and subscription activated",
      subscription,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * =====================================
 * CHECK HOSPITAL SUBSCRIPTION STATUS
 * GET /api/subscription/check/:hospitalId
 * =====================================
 */
exports.checkHospitalSubscription = async (req, res, next) => {
  try {
    const { hospitalId } = req.params;

    const subscription = await Subscription.findOne({
      ownerId: hospitalId,
      ownerModel: "Hospital",
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.json({ success: true, active: false, reason: "No active subscription" });
    }

    // Check if subscription has expired
    if (subscription.endDate && new Date(subscription.endDate) < new Date()) {
      return res.json({ success: true, active: false, reason: "Subscription expired" });
    }

    // Check payment status
    if (subscription.paymentStatus === "failed") {
      return res.json({ success: true, active: false, reason: "Payment failed" });
    }

    res.json({
      success: true,
      active: true,
      plan: subscription.plan,
      endDate: subscription.endDate,
    });
  } catch (err) {
    next(err);
  }
};