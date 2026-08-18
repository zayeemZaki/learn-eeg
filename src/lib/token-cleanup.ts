/**
 * Pruning of spent auth tokens: PasswordResetToken and EmailVerificationOtp.
 *
 * Both tables are append-mostly. Rows are invalidated logically (`usedAt`) or by
 * time (`expiresAt`), and the flows that create them only ever clear the CURRENT
 * subject's prior rows — so a used or expired row for anyone who never returns
 * stays forever. Nothing read that data, but it is dead weight that grows without
 * bound, and OTP rows in particular hold an email address, which is personal data
 * we should not retain past its purpose.
 *
 * WHY OPPORTUNISTIC, NOT A CRON: this app has no scheduler, and adding one for a
 * housekeeping delete is disproportionate. The issuing paths already write to
 * these tables, so they are the natural place to also drop what has expired; the
 * sweep is a single indexed DELETE and runs at most once per issue.
 *
 * CONTRACT: never throws, and never blocks the caller's own work — a failed sweep
 * is logged and ignored. Deleting only rows already past `expiresAt` means this can
 * never remove a token a live flow still depends on.
 */
import { db } from "@/lib/db";

/**
 * Keep expired rows for this long before pruning. A small grace window means a
 * request that raced the expiry boundary still finds its row and can return the
 * accurate "this link/code has expired" message instead of a bare "invalid",
 * which reads as though the user mistyped.
 */
const GRACE_MS = 24 * 60 * 60 * 1000;

/** Delete password-reset tokens that expired more than the grace window ago. */
export async function pruneExpiredPasswordResetTokens(): Promise<void> {
  try {
    await db.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - GRACE_MS) } },
    });
  } catch (error) {
    // Housekeeping only — the caller's reset flow must not fail over this.
    console.error("pruneExpiredPasswordResetTokens failed:", error);
  }
}

/**
 * Delete verification codes that expired more than the grace window ago.
 *
 * Note the interaction with the anti-brute-force counter in the OTP action: it
 * sums `attempts` over rows from the trailing hour, so the grace window must stay
 * comfortably longer than that hour or a lockout could be pruned away early.
 */
export async function pruneExpiredEmailVerificationOtps(): Promise<void> {
  try {
    await db.emailVerificationOtp.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - GRACE_MS) } },
    });
  } catch (error) {
    console.error("pruneExpiredEmailVerificationOtps failed:", error);
  }
}
