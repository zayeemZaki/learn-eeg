/**
 * OTP-first email verification (ahead of registration). Isolated behind one
 * module, mirroring src/lib/password.ts and the hashing convention in
 * src/app/actions/password-reset.ts: only the SHA-256 HASH of the code is ever
 * persisted, never the raw value.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

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

/**
 * Constant-time comparison of a submitted code against a stored hash.
 *
 * Hashing already destroys most of the timing signal (an attacker cannot steer
 * the comparison by choosing input, because they do not control the digest), but
 * `===` on strings short-circuits at the first differing byte, and there is no
 * reason to leave even that much. `timingSafeEqual` needs equal-length buffers,
 * hence the length check first — both sides are fixed-width SHA-256 hex here, so
 * a mismatch means malformed input, not a wrong guess.
 */
export function verifyOtpHash(code: string, storedHash: string): boolean {
  const submitted = Buffer.from(hashOtp(code), "utf8");
  const stored = Buffer.from(storedHash, "utf8");
  if (submitted.length !== stored.length) return false;
  return timingSafeEqual(submitted, stored);
}
