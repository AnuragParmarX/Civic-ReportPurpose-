import { validationResult } from "express-validator";

import { ApiError } from "../utils/apiError.js";

export function handleValidationErrors(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new ApiError(400, "Request validation failed", errors.array()),
    );
  }
  next();
}
