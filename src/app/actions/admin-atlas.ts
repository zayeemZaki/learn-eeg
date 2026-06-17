"use server";

/**
 * Admin atlas-entry CRUD. Each action is an independently-invocable public
 * endpoint, so the route/page guard is NOT sufficient: every action re-checks
 * role === "ADMIN" at the very top (requireAdmin) and re-validates its input
 * with the shared zod schema before touching the database. Never trust the
 * client. (Same contract as admin-questions.ts; the ActionResult type is reused
 * from there so the two stay in lockstep.)
 *
 * An AtlasEntry is FLAT — scalar fields only, with no nested relations and no
 * inbound foreign keys — so create/update are single writes and delete is a
 * plain delete with no cascade footgun (unlike Question, whose Choices and
 * Attempts had to be reconciled).
 *
 * After any mutation we revalidate the admin list AND both PUBLIC atlas tabs so
 * the change is reflected everywhere immediately.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { atlasEntrySchema, type AtlasEntryInput } from "@/lib/validations/atlas";
import { type ActionResult } from "@/app/actions/admin-questions";

/**
 * Drop the caches that show atlas entries: the admin list and BOTH public
 * category tabs. The public atlas is one dynamic route (/atlas/[category]) split
 * into two slugs; revalidating each concrete path is precise and cheap.
 */
function revalidateAtlasViews() {
  revalidatePath("/admin/atlas");
  revalidatePath("/atlas/normal");
  revalidatePath("/atlas/abnormal");
}

/**
 * Create an atlas entry. Redirects to the admin list on success; returns a
 * field-style error on validation failure.
 */
export async function createAtlasEntry(
  raw: AtlasEntryInput,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = atlasEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { title, category, description, imageUrl } = parsed.data;

  await db.atlasEntry.create({
    data: { title, category, description, imageUrl },
  });

  revalidateAtlasViews();
  redirect("/admin/atlas");
}

/**
 * Update an atlas entry's scalar fields. Redirects to the admin list on success;
 * returns a field-style error on validation failure or a missing entry.
 */
export async function updateAtlasEntry(
  id: string,
  raw: AtlasEntryInput,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = atlasEntrySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { title, category, description, imageUrl } = parsed.data;

  const existing = await db.atlasEntry.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Atlas entry not found" };

  try {
    await db.atlasEntry.update({
      where: { id },
      data: { title, category, description, imageUrl },
    });
  } catch (error) {
    // Log server-side for diagnostics; keep the client message generic.
    console.error("updateAtlasEntry failed:", error);
    return { ok: false, error: "Could not save changes. Please try again." };
  }

  revalidateAtlasViews();
  redirect("/admin/atlas");
}

/**
 * Delete an atlas entry. No inbound foreign keys reference AtlasEntry, so this
 * is a straightforward delete — no cascade and no dangling-reference risk.
 */
export async function deleteAtlasEntry(id: string): Promise<ActionResult> {
  await requireAdmin();

  if (!id) return { ok: false, error: "Missing atlas entry id" };

  try {
    await db.atlasEntry.delete({ where: { id } });
  } catch (error) {
    console.error("deleteAtlasEntry failed:", error);
    return { ok: false, error: "Could not delete the atlas entry." };
  }

  revalidateAtlasViews();
  return { ok: true };
}
