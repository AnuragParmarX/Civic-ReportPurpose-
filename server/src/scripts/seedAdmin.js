import bcrypt from "bcryptjs";

import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

const name = process.env.ADMIN_NAME?.trim();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!name || !email || !password || password.length < 12) {
  throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters.");
}

await connectDatabase(env.mongoUri);
const passwordHash = await bcrypt.hash(password, 12);
const user = await User.findOneAndUpdate(
  { email },
  { name, email, passwordHash, role: "admin" },
  { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
);

console.log(`Administrator ready: ${user.email}`);
await User.db.close();
