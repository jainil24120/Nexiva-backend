// middleware/roleMiddleware.js
const AppError = require("../utils/AppError");

const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // 1️⃣ Ensure user is authenticated
      if (!req.user || !req.user.role) {
        return next(new AppError("Unauthorized - user not authenticated", 401));
      }

      // 2️⃣ Normalize roles array
      const rolesArray = Array.isArray(allowedRoles[0])
        ? allowedRoles[0]
        : allowedRoles;

      // 3️⃣ Role validation
      if (!rolesArray.includes(req.user.role)) {
        return next(
          new AppError(
            `Access denied. Role '${req.user.role}' is not allowed`,
            403
          )
        );
      }

      // 4️⃣ Access granted
      next();
    } catch (error) {
      next(new AppError("Role authorization failed", 500));
    }
  };
};

module.exports = roleMiddleware;