const BaseError = require("../utils/BaseError")

module.exports = (err, req, res, next) => {
  console.log("GLOBAL ERROR 💥",err);
  // Xatolik BaseError da bo'lsa
  if (err instanceof BaseError) {
    return res.status(err.status).json({
      message: err.message,
      errors: err.errors,
    });
  }
  // Xatolik Mongoosening ValidationErrorda bo'lsa
  if (err.name === "ValidationError") {
    const errorMessages = Object.values(err.errors).map(
      (error) => error.message
    );
    return res.status(400).json({
      message: "Validation Error",
      errors: errorMessages,
    });
  }
  // Xatolik MongoDB noyoblik xatolaridan bo'lsa
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue).join(", ");
    return res.status(400).json({
      message: `Duplicate value for fields: ${fields}`,
    });
  }
  // JWT yoki authentication bilan bog'liq xatoliklar
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: `Invalid Token`,
    });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: `Token has expired`,
    });
  }
  // Umumiy xatoliklar uchun
  return res.status(500).json({
    message: "Server error",
    errors: [err.message || "Unexpected error occured"],
  });
};
