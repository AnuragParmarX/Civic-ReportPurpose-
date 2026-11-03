import { Router } from "express";
import { body, param, query } from "express-validator";

import {
  createIssue,
  getIssue,
  listIssues,
  removeVoteForIssue,
  updateIssue,
  updateIssueStatus,
  voteForIssue,
} from "../controllers/issueController.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { handleValidationErrors } from "../middleware/validation.js";

const router = Router();
const idRule = param("id").trim().notEmpty().withMessage("Issue id is required");
const categoryValues = [
  "Roads & Potholes",
  "Garbage & Sanitation",
  "Streetlights",
  "Drainage & Water",
  "Public Safety",
  "Other",
];

const issueFields = [
  body("title").optional().trim().isLength({ min: 5, max: 100 }).withMessage("Title must be 5-100 characters"),
  body("category").optional().isIn(categoryValues).withMessage("Invalid issue category"),
  body("locality").optional().trim().isLength({ min: 2, max: 100 }).withMessage("Locality must be 2-100 characters"),
  body("description").optional({ values: "null" }).isString().isLength({ max: 500 }).withMessage("Description must be at most 500 characters"),
  body("imageReference")
    .optional({ values: "null" })
    .custom((value) => {
      if (!value) return true;

      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    })
    .withMessage("Image reference must be a valid URL"),
  body("latitude").optional({ values: "null" }).isFloat({ min: -90, max: 90 }).withMessage("Latitude must be between -90 and 90"),
  body("longitude").optional({ values: "null" }).isFloat({ min: -180, max: 180 }).withMessage("Longitude must be between -180 and 180"),
  body("priority").optional().isIn(["Low", "Medium", "High"]).withMessage("Invalid priority"),
];

router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
    query("status").optional().isIn(["Reported", "Under Review", "In Progress", "Resolved"]).withMessage("Invalid status"),
    query("category").optional().isIn(categoryValues).withMessage("Invalid issue category"),
    handleValidationErrors,
  ],
  optionalAuth,
  listIssues,
);
router.post(
  "/",
  [
    body("title").trim().isLength({ min: 5, max: 100 }).withMessage("Title must be 5-100 characters"),
    body("category").isIn(categoryValues).withMessage("Invalid issue category"),
    body("locality").trim().isLength({ min: 2, max: 100 }).withMessage("Locality must be 2-100 characters"),
    issueFields[3],
    issueFields[4],
    issueFields[7],
    body("reporterLatitude")
      .exists()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Reporter latitude is required and must be between -90 and 90"),
    body("reporterLongitude")
      .exists()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Reporter longitude is required and must be between -180 and 180"),
    body("problemLatitude")
      .exists()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Problem latitude is required and must be between -90 and 90"),
    body("problemLongitude")
      .exists()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Problem longitude is required and must be between -180 and 180"),
    handleValidationErrors,
  ],
  requireAuth,
  createIssue,
);
router.get("/:id", [idRule, handleValidationErrors], optionalAuth, getIssue);
router.patch(
  "/:id",
  [idRule, ...issueFields, handleValidationErrors],
  requireAuth,
  requireRole("admin"),
  updateIssue,
);
router.patch(
  "/:id/status",
  [
    idRule,
    body("status").isIn(["Reported", "Under Review", "In Progress", "Resolved"]).withMessage("Invalid status"),
    body("resolutionNotes").optional().isString().isLength({ max: 500 }).withMessage("Resolution notes must be at most 500 characters"),
    handleValidationErrors,
  ],
  requireAuth,
  requireRole("admin"),
  updateIssueStatus,
);
router.post(
  "/:id/vote",
  [idRule, handleValidationErrors],
  requireAuth,
  requireRole("citizen"),
  voteForIssue,
);
router.delete(
  "/:id/vote",
  [idRule, handleValidationErrors],
  requireAuth,
  requireRole("citizen"),
  removeVoteForIssue,
);
export default router;
