import "dotenv/config";

const requiredEnvironmentVariables = ["MONGODB_URI", "JWT_SECRET"];

for (const variable of requiredEnvironmentVariables) {
  if (!process.env[variable]?.trim()) {
    throw new Error(
      `Missing required environment variable: ${variable}. Copy server/.env.example to server/.env and configure it.`,
    );
  }
}

export const env = {
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  jwtSecret: process.env.JWT_SECRET,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
};
