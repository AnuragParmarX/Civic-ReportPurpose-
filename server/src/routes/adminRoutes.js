import { Router } from "express";
import { body, param, query } from "express-validator";

import {
  flagAdminIssue,
  deleteAdminIssue,
  getAdminStats,
  listAdminIssues,
  updateAdminIssue,
} from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { handleValidationErrors } from "../middleware/validation.js";

const router = Router();
const statusValues = ["Reported", "Under Review", "In Progress", "Resolved"];
const categoryValues = [
  "Roads & Potholes",
  "Garbage & Sanitation",
  "Streetlights",
  "Drainage & Water",
  "Public Safety",
  "Other",
];

router.use(requireAuth, requireRole("admin"));
router.get("/stats", getAdminStats);
router.get(
  "/issues",
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("status").optional().isIn(statusValues),
    query("category").optional().isIn(categoryValues),
    query("priority").optional().isIn(["Low", "Medium", "High"]),
    query("flagged").optional().isBoolean(),
    handleValidationErrors,
  ],
  listAdminIssues,
);
router.patch(
  "/issues/:id",
  [
    param("id").trim().notEmpty(),
    body("status").optional().isIn(statusValues),
    body("priority").optional().isIn(["Low", "Medium", "High"]),
    body("resolutionNotes").optional({ values: "null" }).isString().isLength({ max: 500 }),
    handleValidationErrors,
  ],
  updateAdminIssue,
);
router.patch(
  "/issues/:id/flag",
  [
    param("id").trim().notEmpty(),
    body("flagged").isBoolean(),
    body("reason").optional().isIn(["Suspicious", "Potential duplicate"]),
    handleValidationErrors,
  ],
  flagAdminIssue,
);
router.delete(
  "/issues/:id",
  [param("id").trim().notEmpty(), handleValidationErrors],
  deleteAdminIssue,
);

export default router;
