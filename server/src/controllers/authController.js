import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function createToken(user) {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: user._id.toString(),
    expiresIn: env.jwtExpiresIn,
  });
}

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export const register = asyncHandler(async (req, res) => {
  const { email, name, password } = req.body;
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, name, passwordHash });

  res.status(201).json({
    data: { token: createToken(user), user: serializeUser(user) },
  });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select(
    "+passwordHash",
  );
  const passwordMatches = user
    ? await bcrypt.compare(req.body.password, user.passwordHash)
    : false;

  if (!user || !passwordMatches) {
    throw new ApiError(401, "Email or password is incorrect");
  }

  res.json({
    data: { token: createToken(user), user: serializeUser(user) },
  });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({ data: { user: serializeUser(req.user) } });
});
