import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Go up 3 levels: apps/api/src/config.ts -> apps/api -> apps -> root (levaconnect)
const rootDir = join(__dirname, "..", "..", "..");

console.log("config.ts: Loading dotenv from", join(rootDir, ".env"));
dotenvConfig({ path: join(rootDir, ".env") });

console.log("config.ts: JWT_ACCESS_SECRET after dotenv:", process.env.JWT_ACCESS_SECRET ? "SET" : "NOT SET");

export const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.API_PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "",
  JWT_ACCESS_EXPIRES_IN: "15m",
  JWT_REFRESH_EXPIRES_IN: "7d",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_WINDOW: "1 minute",
  AUTH_RATE_LIMIT_MAX: 5,
  AUTH_RATE_LIMIT_WINDOW: "15 minutes",
};

console.log("config.ts: config.JWT_ACCESS_SECRET:", config.JWT_ACCESS_SECRET ? "SET" : "NOT SET");

if (config.NODE_ENV === "production") {
  const required = [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
  ];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}