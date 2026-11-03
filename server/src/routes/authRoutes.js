import { Router } from "express";
import { body } from "express-validator";

import {
  getCurrentUser,
  login,
  register,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { handleValidationErrors } from "../middleware/validation.js";

const router = Router();

const emailRule = body("email").isEmail().withMessage("A valid email is required");
const passwordRule = body("password")
  .isString()
  .isLength({ min: 8, max: 72 })
  .withMessage("Password must be between 8 and 72 characters");

router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Name must be 2-80 characters"),
    emailRule,
    passwordRule,
    handleValidationErrors,
  ],
  register,
);
router.post("/login", [emailRule, passwordRule, handleValidationErrors], login);
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", requireAuth, (_req, res) => {
  res.json({ data: { message: "Logged out successfully" } });
});

export default router;
