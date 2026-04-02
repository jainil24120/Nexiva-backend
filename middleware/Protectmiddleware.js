const jwt = require("jsonwebtoken");
const Hospital = require("../models/Hospital");

const protect = async (req, res, next) => {
  try {

    let token;

    // 1 Token check
    if (!req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer")) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    token = req.headers.authorization.split(" ")[1];

    // 2 Token verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3 Hospital find
    const hospital = await Hospital.findById(decoded.id).select("-password");

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found"
      });
    }

    // 4 Check active status
    if (hospital.status === "inactive") {
      return res.status(403).json({
        success: false,
        message: "Hospital account inactive"
      });
    }

    // 5 Attach hospital to request
    req.hospital = hospital;

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });

  }
};

module.exports = protect;