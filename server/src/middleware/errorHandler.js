import { env } from "../config/env.js";

export function notFoundHandler(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let details = error.details;

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Database validation failed";
    details = Object.values(error.errors).map((item) => item.message);
  } else if (error.code === 11000) {
    statusCode = 409;
    message = "A record with this unique value already exists";
    details = Object.keys(error.keyPattern || {});
  } else if (error.name === "MulterError") {
    statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = error.message || "Invalid image upload";
  }

  if (statusCode >= 500) {
    console.error(error);
    if (env.nodeEnv === "production") {
      message = "Internal server error";
      details = undefined;
    }
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(details ? { details } : {}),
    },
  });
}
