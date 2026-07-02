import dotenv from "dotenv";
import { z } from "zod";

// Load .env once, centrally. `quiet` suppresses dotenv v17's startup banner.
dotenv.config({ quiet: true });

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

/**
 * Central, validated and fully typed environment configuration.
 *
 * All `process.env` access goes through the exported `env` object, so missing
 * or malformed variables fail fast at startup (with a readable error) instead
 * of surfacing as `undefined` deep inside the app.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Database
  DBHOST: z.string().min(1),
  DBPORT: z.coerce.number().int().positive(),
  DBNAME: z.string().min(1),
  DBUSER: z.string().min(1),
  DBPASSWORD: z.string().min(1),

  // Auth
  SECRETKEYJWT: z.string().min(1),
  JWT_EXPIRES_IN: z.string().min(1).default("100h"),

  // HTTP / CORS
  HTTPPORT: z.coerce.number().int().positive().default(9080),
  CORS_ORIGIN: z.string().min(1),

  // Logging
  LOG_DIR: z.string().optional(),

  // SMTP
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanFromString,
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  console.error(`❌ Invalid or missing environment variables:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
