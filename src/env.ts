/**
 * Validated environment access.
 *
 * Parsing once at import time means a misconfigured deploy fails fast and loud
 * instead of throwing deep inside a request. Import `env` everywhere rather than
 * reading `process.env` directly, so every variable has a type and a contract.
 */
import { z } from "zod";

// Auth.js derives the JWT signing/encryption key from AUTH_SECRET, so its
// entropy is the entire session-forgery boundary. `npx auth secret` emits 32+
// bytes; requiring that here turns a weak secret into a boot failure instead of
// a quietly forgeable token.
const MIN_AUTH_SECRET_LENGTH = 32;

// The dev default for APP_URL. Named so the production guard below can detect
// "still on the default" without duplicating the literal.
const LOCAL_APP_URL = "http://localhost:3000";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z
    .string()
    .min(
      MIN_AUTH_SECRET_LENGTH,
      `AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters (generate one with: npx auth secret)`,
    ),
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
  // Absolute origin used to build links inside emails. Defaults to localhost for
  // dev. It is NOT validated against NODE_ENV here — `next build` runs with
  // NODE_ENV=production, so a schema-level rule would fail every local and CI
  // build on a machine that has no deployed origin to point at. The check belongs
  // at the point of USE instead: see requirePublicAppUrl() below.
  APP_URL: z.string().url().default(LOCAL_APP_URL),
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

/**
 * The absolute origin for links placed in outgoing email, asserted to be usable.
 *
 * A production deploy that never set APP_URL would otherwise send password-reset
 * links pointing at localhost: the mail sends, the flow reports success, and the
 * recipient gets a dead link — a failure that is invisible from the server side.
 * Throwing here converts that into a loud error on the one code path that cares,
 * while leaving builds (which run with NODE_ENV=production but have no deployed
 * origin) and local development untouched.
 *
 * Call this instead of reading env.APP_URL directly whenever the value is going
 * into an email.
 */
export function requirePublicAppUrl(): string {
  if (env.NODE_ENV === "production" && env.APP_URL === LOCAL_APP_URL) {
    throw new Error(
      "APP_URL must be set to the deployed origin in production; refusing to send an email containing a localhost link",
    );
  }
  return env.APP_URL;
}
