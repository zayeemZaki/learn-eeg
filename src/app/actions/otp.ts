"use server";

/**
 * OTP-first email verification, ahead of registration. Two halves:
 *   sendOtp   — issue a 6-digit code and email it.
 *   verifyOtp — consume a code and mark the email verified for this browser.
 *
 * Security posture (mirrors src/app/actions/password-reset.ts):
 *  - No user enumeration: sendOtp returns the SAME generic success regardless
 *    of whether the email is already registered or whether the send actually
 *    succeeded.
 *  - Codes are random (crypto.randomInt), single-use (usedAt), time-limited
 *    (10 min), and stored only as a SHA-256 HASH — the raw code never touches
 *    the DB. Prior unused codes for an email are deleted when a new one is
 *    issued, so at most one is ever live.
 *  - Unlike the 256-bit reset token, a 6-digit code is brute-forceable
 *    (1,000,000 possibilities): each row tracks `attempts` and locks out after
 *    MAX_ATTEMPTS wrong guesses, on top of IP + email-keyed rate limiting on
 *    the send side. Because issuing a new code deletes the old row, the per-row
 *    counter alone would let an attacker reset their own lockout by requesting
 *    another code; sendOtp therefore also refuses to issue while this email has
 *    accumulated MAX_FAILED_ATTEMPTS_PER_EMAIL_PER_HOUR failures in the last
 *    hour (see recordFailedAttempt / the send-side guard).
 *  - "Which email is mid-verification" is carried in a short-lived httpOnly
 *    cookie (not a URL param) so it's never in browser history, referrer
 *    headers, or server logs. A second cookie, set only after a successful
 *    verify, is what registerUser actually trusts.
 */
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  OTP_TTL_MS,
  MAX_ATTEMPTS,
} from "@/lib/otp";
import { rateLimit, OTP_REQUEST_RULE } from "@/lib/rate-limit";
import { pruneExpiredEmailVerificationOtps } from "@/lib/token-cleanup";
import { sendOtpSchema, verifyOtpSchema } from "@/lib/validations/auth";
import { type ActionResult } from "@/app/actions/action-result";

// Cookie carrying which email is mid-verification, set by sendOtp and read by
// verifyOtp. Plain text — an email address isn't a secret — but httpOnly so
// client JS (and any injected script) can't read or tamper with it.
const OTP_EMAIL_COOKIE = "otp_email";
// Cookie set only once verifyOtp succeeds; registerUser requires this to match
// the submitted email before it will create an account.
const OTP_VERIFIED_COOKIE = "otp_verified";

const OTP_EMAIL_COOKIE_MAX_AGE_S = 10 * 60; // matches OTP_TTL_MS
const OTP_VERIFIED_COOKIE_MAX_AGE_S = 15 * 60; // a little slack past verify to finish the form

// Email-keyed send throttle: at most this many codes issued per email per
// hour. The IP rule (OTP_REQUEST_RULE) alone doesn't stop one attacker
// spraying codes at many distinct addresses; this caps abuse of ONE address
// (Resend-quota abuse / annoyance spam) the same way the per-email count in
// password-reset.ts's throttle does, just via a count instead of a recency
// check since we expect legitimate resends here.
const MAX_OTP_SENDS_PER_EMAIL_PER_HOUR = 3;

// Cumulative wrong-guess ceiling per email per hour, ACROSS codes. The per-row
// `attempts` counter caps guesses against one code, but sendOtp deletes the prior
// row when issuing a new one, so on its own it resets every time the attacker
// asks for another code. Summing recent failures closes that loop and makes the
// real budget MAX_FAILED_ATTEMPTS_PER_EMAIL_PER_HOUR per hour, not
// MAX_ATTEMPTS × the send cap.
const MAX_FAILED_ATTEMPTS_PER_EMAIL_PER_HOUR = 10;

/** Failed guesses recorded for this email within the trailing hour. */
async function recentFailedAttempts(email: string): Promise<number> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const rows = await db.emailVerificationOtp.findMany({
    where: { email, createdAt: { gte: hourAgo } },
    select: { attempts: true },
  });
  return rows.reduce((sum, row) => sum + row.attempts, 0);
}

function hashCookieOpts(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/**
 * Step 1 — request a code. ALWAYS returns the same generic success so the
 * endpoint can't be used to discover which emails are already registered.
 */
export async function sendOtp(raw: unknown): Promise<ActionResult> {
  // Per-IP throttle. FAIL-OPEN: with no Redis configured (or on any Redis
  // error) this allows the request — same posture as every other rateLimit
  // call site in this app.
  const { allowed } = await rateLimit(OTP_REQUEST_RULE);
  if (!allowed) return { ok: true };

  const parsed = sendOtpSchema.safeParse(raw);
  // Even a malformed email gets the generic success — see requestPasswordReset
  // for the same reasoning: revealing "invalid email" is itself a weak oracle.
  if (!parsed.success) {
    return { ok: true };
  }
  const { email } = parsed.data; // normalized (trim + lowercase) by the schema

  try {
    // A fresh code must not hand back a fresh guess budget while this email is
    // already locked out for the hour — otherwise the per-row lockout is
    // trivially reset. Same generic success, no new code minted.
    if ((await recentFailedAttempts(email)) >= MAX_FAILED_ATTEMPTS_PER_EMAIL_PER_HOUR) {
      return { ok: true };
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await db.emailVerificationOtp.count({
      where: { email, createdAt: { gte: hourAgo } },
    });
    if (recentCount >= MAX_OTP_SENDS_PER_EMAIL_PER_HOUR) {
      // Still set the cookie so a legitimate user who's hit the cap can at
      // least reach the verify page and use their most recent still-live code
      // rather than being stuck with no path forward.
      const store = await cookies();
      store.set(OTP_EMAIL_COOKIE, email, hashCookieOpts(OTP_EMAIL_COOKIE_MAX_AGE_S));
      return { ok: true };
    }

    const code = generateOtp();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Invalidate any prior codes for this email, then create the new one.
    // Atomic so we never leave two live codes behind on a partial failure.
    await db.$transaction([
      db.emailVerificationOtp.deleteMany({ where: { email } }),
      db.emailVerificationOtp.create({
        data: { email, codeHash, expiresAt },
      }),
    ]);

    // Send failure must not change the user-facing outcome (still generic
    // success) and must not leak the Resend error.
    try {
      await sendOtpEmail(email, code);
    } catch (error) {
      console.error("OTP email failed to send:", error);
    }

    // Opportunistic housekeeping: drop long-expired codes (any email's) now that
    // we're already writing to this table. Never throws.
    await pruneExpiredEmailVerificationOtps();

    const store = await cookies();
    store.set(OTP_EMAIL_COOKIE, email, hashCookieOpts(OTP_EMAIL_COOKIE_MAX_AGE_S));

    return { ok: true };
  } catch (error) {
    console.error("sendOtp error:", error);
    return { ok: true };
  }
}

/**
 * Step 2 — confirm a code. Validates against the most recent unused,
 * unexpired code for the email carried in the otp_email cookie. The consume
 * is ATOMIC (a conditional `usedAt: null` update inside an interactive
 * transaction), mirroring resetPassword's race-safe pattern exactly.
 */
export async function verifyOtp(raw: unknown): Promise<ActionResult> {
  const invalidMessage = "Invalid or expired code.";

  const store = await cookies();
  const email = store.get(OTP_EMAIL_COOKIE)?.value;
  if (!email) {
    return { ok: false, error: invalidMessage };
  }

  const parsed = verifyOtpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { code } = parsed.data;

  const record = await db.emailVerificationOtp.findFirst({
    where: { email, usedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, codeHash: true, expiresAt: true, attempts: true },
  });

  if (!record || record.expiresAt <= new Date()) {
    return { ok: false, error: invalidMessage };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  // Cumulative ceiling across codes for this email — a new code does not buy a
  // new guess budget (see MAX_FAILED_ATTEMPTS_PER_EMAIL_PER_HOUR).
  if ((await recentFailedAttempts(email)) >= MAX_FAILED_ATTEMPTS_PER_EMAIL_PER_HOUR) {
    return { ok: false, error: "Too many attempts. Please try again later." };
  }

  if (!verifyOtpHash(code, record.codeHash)) {
    await db.emailVerificationOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: invalidMessage };
  }

  // ATOMIC single-use consume. Mirrors resetPassword's exact pattern: the
  // lookup above is only a fast pre-check; the real guard is this conditional
  // update. Two concurrent submissions of the same valid code can't both
  // succeed — the loser sees count === 0 and we throw to signal it below.
  const CODE_ALREADY_USED = Symbol("code-already-used");
  try {
    await db.$transaction(async (tx) => {
      const consumed = await tx.emailVerificationOtp.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count === 0) {
        throw CODE_ALREADY_USED;
      }
    });
  } catch (error) {
    if (error === CODE_ALREADY_USED) {
      return { ok: false, error: invalidMessage };
    }
    throw error;
  }

  store.set(OTP_VERIFIED_COOKIE, email, hashCookieOpts(OTP_VERIFIED_COOKIE_MAX_AGE_S));
  store.delete(OTP_EMAIL_COOKIE);

  return { ok: true };
}

/** Read-only helper for server components gating /verify-email and /register/complete. */
export async function getOtpEmailCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(OTP_EMAIL_COOKIE)?.value;
}

/** Read-only helper for server components gating /register/complete. */
export async function getOtpVerifiedCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(OTP_VERIFIED_COOKIE)?.value;
}
