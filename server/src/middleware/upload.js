import { mkdirSync } from "node:fs";
import path from "node:path";
import multer from "multer";

const uploadDirectory = path.resolve("uploads", "issues");
mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`);
  },
});

export const issueImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      return callback(null, true);
    }
    callback(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Only JPG, PNG, and WebP images are allowed"));
  },
});
