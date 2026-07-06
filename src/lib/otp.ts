/**
 * OTP-first email verification (ahead of registration). Isolated behind one
 * module, mirroring src/lib/password.ts and the hashing convention in
 * src/app/actions/password-reset.ts: only the SHA-256 HASH of the code is ever
 * persisted, never the raw value.
 */
import { createHash, randomInt } from "node:crypto";

// 10 minutes. Long enough to find the email and type the code, short enough to
// limit the window a leaked/guessed code is useful.
export const OTP_TTL_MS = 10 * 60 * 1000;

// A 6-digit code has only 1,000,000 possibilities — lock a row out after this
// many wrong guesses rather than relying on rate limiting alone.
export const MAX_ATTEMPTS = 5;

/** A random 6-digit code, zero-padded (e.g. "004821"). */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** SHA-256 hex of the raw code. Only the hash is ever persisted or queried. */
export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
