import dotenv from "dotenv"
import { z } from "zod"

dotenv.config()

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SERVICE_PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  USER_SERVICE_PORT: z.coerce.number().int().min(1).max(65535).default(4002),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:3000"),
  AUTH_SERVICE_URL: z.string().url().default("http://localhost:4001"),
  USER_SERVICE_URL: z.string().url().default("http://localhost:4002"),
  INTERNAL_SERVICE_TOKEN: z.string().min(32),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ADMIN_EMAIL: z.string().email().default("admin@argastro.com"),
  ADMIN_PASSWORD: z.string().min(12),
  DATA_DIR: z.string().default("./data"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(60_000).default(15 * 60 * 1000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(50).default(10),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
})

export const config = configSchema.parse(process.env)
