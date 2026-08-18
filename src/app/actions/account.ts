"use server";

/**
 * Self-service account actions. A signed-in user edits THEIR OWN profile and
 * password here — nothing else. The client never sends a user id: every action
 * derives the target from the session (requireUser → session.user.id), so a
 * crafted payload can't make one user edit another. Page guards are not enough;
 * each action re-checks auth itself (never trust the client).
 *
 * Mirrors the register flow's email handling (normalize + uniqueness pre-check)
 * and reuses the shared password util, so the security-sensitive rules live in
 * one place across register / profile-edit / password-change.
 */
import { Prisma } from "@prisma/client";

import { signOut } from "@/auth";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { profileSchema, changePasswordSchema } from "@/lib/validations/auth";

/**
 * Profile/password result. `reauth` signals the client to sign out to /login,
 * because the current JWT can no longer represent this account:
 *  - the login key (email) changed and the token caches the old one, or
 *  - the password changed, which bumps `sessionsValidFrom` and therefore revokes
 *    every token minted before the change — including this request's own.
 * A name-only change does NOT set it — the new name surfaces on the next
 * server-rendered navigation.
 */
export type AccountResult =
  | { ok: true; reauth?: boolean }
  | { ok: false; error: string };

export async function updateProfile(raw: unknown): Promise<AccountResult> {
  const session = await requireUser();
  const userId = session.user.id;

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email } = parsed.data; // email already normalized by the schema

  // Read the current row to detect an email change (the only field that forces
  // re-login). Scoped to the session id — never a client-supplied id.
  const current = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!current) return { ok: false, error: "Account not found" };

  const emailChanged = email !== current.email;

  // Same uniqueness pre-check the register flow uses, so the friendly error and
  // the normalization match. Only relevant when the email actually changed.
  if (emailChanged) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false, error: "An account with that email already exists" };
    }
  }

  try {
    // Pending verification codes are keyed on the email, not the user, so any
    // that exist belong to the OLD address and can never apply to the new one.
    // Same transaction, so the change stays atomic.
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { name, email },
      }),
      ...(emailChanged
        ? [db.emailVerificationOtp.deleteMany({ where: { email: current.email } })]
        : []),
    ]);
  } catch (error) {
    // Backstop for the race between the pre-check and the write: the unique
    // index is the real guarantee. Same friendly message.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "An account with that email already exists" };
    }
    throw error;
  }

  return { ok: true, reauth: emailChanged };
}

export async function changePassword(raw: unknown): Promise<AccountResult> {
  const session = await requireUser();
  const userId = session.user.id;

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { ok: false, error: "Account not found" };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  // Don't reveal anything beyond "current password is incorrect".
  if (!valid) return { ok: false, error: "Current password is incorrect" };

  // Bumping sessionsValidFrom revokes every JWT minted before now — the whole
  // point of changing a password is that other devices lose access. The CURRENT
  // session's token also predates the bump, so the client must re-authenticate;
  // we report that with the same `reauth` flag an email change uses.
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(newPassword),
      sessionsValidFrom: new Date(),
    },
  });

  return { ok: true, reauth: true };
}

/**
 * Re-issue the session after a credential change (email or password). The
 * credentials JWT caches the old email and is dated against `sessionsValidFrom`,
 * and `trigger:"update"` is not wired in the auth config, so the clean fix is a
 * fresh sign-in: sign out and redirect to /login. Called by the settings forms
 * whenever an account action reports `reauth`. Reuses the same server-action
 * signOut the layouts use — no client next-auth dependency.
 *
 * Deliberately does NOT call requireUser(): a password change has already revoked
 * this very session, so the guard would throw and strand the user on an error
 * boundary instead of signing them out. Signing out an unauthenticated caller is
 * a no-op, so there is nothing to protect here.
 */
export async function reauthAfterCredentialChange(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
