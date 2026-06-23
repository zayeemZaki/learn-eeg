"use server";

/**
 * Forgot-password server actions (M6). Two halves:
 *   requestPasswordReset — issue a token and email a reset link.
 *   resetPassword        — consume a token and set a new password.
 *
 * Security posture (see the checklist in the M6 brief):
 *  - No user enumeration: requestPasswordReset returns the SAME generic success
 *    whether or not the email maps to an account, and whether or not the email
 *    actually sent.
 *  - Tokens are random (crypto.randomBytes), single-use (usedAt), time-limited
 *    (1h), and stored only as a SHA-256 HASH — the raw token never touches the
 *    DB. Prior unused tokens are deleted when a new one is issued and when one
 *    is consumed, so at most one is ever live per user.
 *  - resetPassword reuses the registration password rule and the shared
 *    hashPassword util. Generic errors never reveal token internals.
 *  - No secrets/tokens are logged; Resend errors are swallowed (logged in
 *    email.ts only) and never surfaced.
 *
 * Note on sessions: sessions are JWT, so a password change does NOT invalidate
 * existing sessions. That's accepted for this milestone — we don't attempt
 * global revocation. The reset flow itself never auto-logs-in.
 */
import { createHash, randomBytes } from "node:crypto";

import { env } from "@/env";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import { rateLimit, FORGOT_PASSWORD_RULE } from "@/lib/rate-limit";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

// One hour. Long enough to act on the email, short enough to limit exposure.
const TOKEN_TTL_MS = 60 * 60 * 1000;

// Lightweight per-email throttle: if an unused, unexpired token was minted
// within this window, we skip issuing/sending another. Cheap abuse mitigation
// that also keeps us under Resend's 2 req/sec ceiling for repeated clicks.
const RESEND_THROTTLE_MS = 60 * 1000;

/** SHA-256 hex of the raw token. Only the hash is ever persisted or queried. */
function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Step 1 — request a reset. ALWAYS returns the same generic success so the
 * endpoint can't be used to discover which emails are registered.
 */
export async function requestPasswordReset(raw: unknown): Promise<ActionResult> {
  // Per-IP throttle to blunt reset-email spraying across many addresses (the
  // per-email throttle below only covers repeats of one address). FAIL-OPEN: with
  // no Redis (or on any Redis error) this allows the request. On limit we return
  // the SAME generic success the flow always returns — a throttled request must be
  // indistinguishable from a normal one (no enumeration / limit-state oracle).
  const { allowed } = await rateLimit(FORGOT_PASSWORD_RULE);
  if (!allowed) return { ok: true };

  const parsed = forgotPasswordSchema.safeParse(raw);
  // Even a malformed email gets the generic success: revealing "invalid email"
  // vs "sent" is itself a (weak) oracle, and the form already validates shape.
  if (!parsed.success) {
    return { ok: true };
  }
  const { email } = parsed.data; // normalized (trim + lowercase) by the schema

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // Unknown email: do nothing, but return success all the same.
    if (!user) {
      return { ok: true };
    }

    // Throttle: if a still-valid, unused token exists from very recently, don't
    // mint/send another. Repeated clicks become no-ops (still generic success).
    const recent = await db.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
        createdAt: { gt: new Date(Date.now() - RESEND_THROTTLE_MS) },
      },
      select: { id: true },
    });
    if (recent) {
      return { ok: true };
    }

    // Fresh token: random raw value the user receives, only its hash persisted.
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    // Invalidate any prior tokens for this user, then create the new one.
    // Atomic so we never leave two live tokens behind on a partial failure.
    await db.$transaction([
      db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      db.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      }),
    ]);

    const resetUrl = `${env.APP_URL}/reset-password?token=${rawToken}`;

    // Send the RAW token in the link. A send failure must not change the user-
    // facing outcome (still generic success) and must not leak the Resend error.
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      console.error("Password-reset email failed to send:", error);
    }

    return { ok: true };
  } catch (error) {
    // Any unexpected failure still returns the uniform response — but log it so
    // a real outage is visible server-side (no token/secret in the log).
    console.error("requestPasswordReset error:", error);
    return { ok: true };
  }
}

/**
 * Step 2 — confirm a reset. Validates the token (exists, unexpired, unused),
 * sets the new password, marks the token used, and clears the user's other
 * tokens. The consume is ATOMIC (a conditional `usedAt: null` update inside an
 * interactive transaction), so a token can be redeemed at most once even under
 * concurrent submission. Errors are deliberately generic about token state.
 */
export async function resetPassword(raw: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { token, newPassword } = parsed.data;

  // Look the token up by its HASH — the raw value is never stored.
  const tokenHash = hashToken(token);
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  // Uniform rejection for not-found / used / expired — don't reveal which.
  const invalidMessage =
    "This reset link is invalid or has expired. Please request a new one.";
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return { ok: false, error: invalidMessage };
  }

  const passwordHash = await hashPassword(newPassword);

  // ATOMIC single-use consume. The read above is only a fast pre-check; the real
  // guard is the conditional update inside this interactive transaction:
  // `updateMany({ where: { id, usedAt: null }})` marks the token used ONLY if it
  // is still unused at write time. Two concurrent requests carrying the same
  // valid token therefore can't both succeed — exactly one sees count === 1; the
  // loser sees count === 0 and we throw to ROLL BACK the whole transaction, so
  // the password set never lands for the loser. (An interactive transaction is
  // required here — a plain statement array would commit the password update
  // unconditionally, regardless of the consume's count.)
  const TOKEN_ALREADY_USED = Symbol("token-already-used");
  try {
    await db.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count === 0) {
        // Lost the race: token was consumed between the pre-check and here.
        throw TOKEN_ALREADY_USED;
      }
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });
      // Defensively clear the user's other tokens in the same transaction.
      await tx.passwordResetToken.deleteMany({
        where: { userId: record.userId, id: { not: record.id } },
      });
    });
  } catch (error) {
    if (error === TOKEN_ALREADY_USED) {
      // Same generic failure the flow already uses — no new enumeration signal.
      return { ok: false, error: invalidMessage };
    }
    throw error;
  }

  return { ok: true };
}
