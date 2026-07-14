"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  adminUpdateUserSchema,
  adminResetPasswordSchema,
} from "@/lib/validations/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

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
    await db.user.update({
      where: { id: targetId },
      data: { name, email, position, institution, role },
    });
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

  await db.user.update({
    where: { id: targetId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
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
