/**
 * Validated environment access.
 *
 * Parsing once at import time means a misconfigured deploy fails fast and loud
 * instead of throwing deep inside a request. Import `env` everywhere rather than
 * reading `process.env` directly, so every variable has a type and a contract.
 */
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  REDIS_URL: z.string().url().optional(),
  // Optional so the app still boots without Blob configured; the admin upload
  // route returns a clear runtime error if it's missing when an upload starts.
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  // Password-reset email (M6). Optional so the app still boots without it;
  // the send path (src/lib/email.ts) throws a clear runtime error if the key is
  // missing when a reset is actually requested.
  RESEND_API_KEY: z.string().optional(),
  // Sender for transactional mail. Stays on Resend's sandbox sender (which only
  // delivers to the account owner's address) until a domain is verified — then
  // this becomes you@yourdomain. One env-var swap, no code change.
  EMAIL_FROM: z.string().default("EEG Quiz <onboarding@resend.dev>"),
  // Absolute origin used to build reset links in emails. Defaults to localhost
  // for dev; set to the deployed origin in production.
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
