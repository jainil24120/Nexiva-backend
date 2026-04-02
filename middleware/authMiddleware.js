const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const User = require("../models/user");

// 🔐 Protect routes (authentication)
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Not authorized, token missing", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    try {
      user = await User.findById(decoded.id).select("-password");
    } catch (dbErr) {
      // Database error (e.g. connection lost after sleep) — return 503, not 401
      return next(new AppError("Service temporarily unavailable. Please retry.", 503));
    }

    if (!user) {
      return next(new AppError("Not authorized, user not found", 401));
    }
    req.user = user;
    next();
  } catch (err) {
    return next(new AppError("Not authorized, token invalid", 401));
  }
});

// 🔐 Role-based authorization
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Not authorized", 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`User role '${req.user.role}' not allowed`, 403)
      );
    }
    next();
  };
};