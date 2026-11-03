import { Router } from "express";

import { requireAuth, requireRole } from "../middleware/auth.js";
import { issueImageUpload } from "../middleware/upload.js";

const router = Router();

router.post(
  "/issue-image",
  requireAuth,
  requireRole("citizen"),
  issueImageUpload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: { message: "An image file is required" } });
    }

    res.status(201).json({
      data: {
        imageReference: `${req.protocol}://${req.get("host")}/uploads/issues/${req.file.filename}`,
      },
    });
  },
);

export default router;
