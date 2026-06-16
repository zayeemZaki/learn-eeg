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
  PUBMED_API_KEY: z.string().optional(),
  // Optional so the app still boots without Blob configured; the admin upload
  // route returns a clear runtime error if it's missing when an upload starts.
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
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
