"use server";

/**
 * Admin user administration: edit any user's profile + role, reset their
 * password, delete them. Each action is an independently-invocable public
 * endpoint, so the route/page guard is NOT sufficient — every one re-checks
 * role === "ADMIN" at the top (requireAdmin, which also re-reads the CURRENT role
 * from the database) and re-validates its input with the shared zod schema.
 *
 * PRIVILEGE GUARDS, beyond "is an admin". An admin acting on users can lock
 * everyone out, so two invariants are enforced here rather than in the UI:
 *  - no self role-change and no self-delete (an admin cannot strip their own
 *    access), compared against the actor id from the SESSION, never the payload;
 *  - the last remaining ADMIN can be neither demoted nor deleted, so the platform
 *    always has someone who can administer it.
 *
 * A password reset also bumps the target's session watermark, revoking every token
 * that account already holds — see src/lib/auth-guards.ts.
 */
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  adminUpdateUserSchema,
  adminResetPasswordSchema,
} from "@/lib/validations/auth";
import { type ActionResult } from "@/app/actions/action-result";

export async function updateUser(
  targetId: string,
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireAdmin();

  if (!targetId) return { ok: false, error: "Missing user" };

  const parsed = adminUpdateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, email, position, institution, role } = parsed.data;

  // Current row: needed to know whether role is actually changing (drives both
  // guards) and the current email (drives the uniqueness check). No passwordHash.
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, role: true },
  });
  if (!target) return { ok: false, error: "User not found" };

  const roleChanged = role !== target.role;

  // Self role-change → refuse (prevents an admin demoting themselves and losing
  // access). Compares against the actor id from the session, not the payload.
  if (roleChanged && targetId === session.user.id) {
    return { ok: false, error: "You can't change your own role." };
  }

  // Last-admin → refuse a demotion that would leave zero admins.
  if (roleChanged && target.role === "ADMIN" && role === "USER") {
    const adminCount = await db.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return {
        ok: false,
        error: "Can't remove the last admin. Promote another user first.",
      };
    }
  }

  // Same email uniqueness handling as the self-service flow: only when changed,
  // friendly pre-check, unique-index backstop.
  const emailChanged = email !== target.email;
  if (emailChanged) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { ok: false, error: "An account with that email already exists" };
    }
  }

  try {
    // Any pending verification codes belong to the OLD address (that table is
    // keyed on email, not on a user id), so they can never apply to the new one.
    // Clearing them in the same transaction keeps the change atomic and stops the
    // rows lingering unreachable.
    await db.$transaction([
      db.user.update({
        where: { id: targetId },
        data: { name, email, position, institution, role },
      }),
      ...(emailChanged
        ? [db.emailVerificationOtp.deleteMany({ where: { email: target.email } })]
        : []),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "An account with that email already exists" };
    }
    throw error;
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetId}`);
  return { ok: true };
}

export async function adminResetPassword(
  targetId: string,
  raw: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  if (!targetId) return { ok: false, error: "Missing user" };

  const parsed = adminResetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Admin override: no current-password required. Confirm the target exists, then
  // set the new hash. (No email is sent — that's M6.)
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "User not found" };

  // Bump the session watermark alongside the hash: an admin resetting someone's
  // password is often responding to a compromise, so every token that account
  // already holds must stop working rather than outliving the reset.
  await db.user.update({
    where: { id: targetId },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      sessionsValidFrom: new Date(),
    },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUser(targetId: string): Promise<ActionResult> {
  const session = await requireAdmin();

  if (!targetId) return { ok: false, error: "Missing user" };

  if (targetId === session.user.id) {
    return { ok: false, error: "You can't delete your own account." };
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, role: true },
  });
  if (!target) return { ok: false, error: "User not found" };

  if (target.role === "ADMIN") {
    const adminCount = await db.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return {
        ok: false,
        error: "Can't remove the last admin. Promote another user first.",
      };
    }
  }

  try {
    await db.$transaction([
      db.emailVerificationOtp.deleteMany({ where: { email: target.email } }),
      db.user.delete({ where: { id: targetId } }),
    ]);
  } catch (error) {
    console.error("deleteUser failed:", error);
    return { ok: false, error: "Could not delete the user." };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}
