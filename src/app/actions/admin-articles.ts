"use server";

/**
 * Admin literature-article CRUD. Each action is an independently-invocable public
 * endpoint, so the route/page guard is NOT sufficient: every action re-checks
 * role === "ADMIN" at the very top (requireAdmin) and re-validates its input with
 * the shared zod schema before touching the database. Never trust the client.
 * (Same contract as admin-atlas.ts / admin-questions.ts; the ActionResult type is
 * reused so the actions stay in lockstep.)
 *
 * An Article is FLAT — scalar fields only, no relations and no inbound foreign
 * keys — so create/update are single writes and delete is a plain delete with no
 * cascade footgun.
 *
 * BLOB CLEANUP: unlike Atlas (whose delete leaks Blob objects), the optional
 * article figure is cleaned up like a QUESTION image — when the image URL changes
 * on update, or on delete, the OLD Blob object is removed via deleteBlobs AFTER
 * the DB write commits. deleteBlobs never throws, so a Blob failure can't fail the
 * request (a leaked object is recoverable; a failed user action is worse).
 *
 * After any mutation we revalidate the admin list AND the public /literature page
 * so the change is reflected everywhere immediately.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { deleteBlobs } from "@/lib/blob-cleanup";
import { articleSchema, type ArticleInput } from "@/lib/validations/article";
import { type ActionResult } from "@/app/actions/admin-questions";

/** Drop the caches that show articles: the admin list and the public page. */
function revalidateArticleViews() {
  revalidatePath("/admin/articles");
  revalidatePath("/literature");
}

/**
 * Create an article. Redirects to the admin list on success; returns a
 * field-style error on validation failure.
 */
export async function createArticle(raw: ArticleInput): Promise<ActionResult> {
  await requireAdmin();

  const parsed = articleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { title, summary, url, source, publishedAt, imageUrl } = parsed.data;

  await db.article.create({
    // Optional fields are undefined when absent → stored as null.
    data: { title, summary, url, source, publishedAt, imageUrl },
  });

  revalidateArticleViews();
  redirect("/admin/articles");
}

/**
 * Update an article's scalar fields. Redirects to the admin list on success;
 * returns a field-style error on validation failure or a missing article.
 *
 * If the figure changed (a different URL, or the image was removed), the OLD Blob
 * object is cleaned up AFTER the update commits.
 */
export async function updateArticle(
  id: string,
  raw: ArticleInput,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = articleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { title, summary, url, source, publishedAt, imageUrl } = parsed.data;

  // Read the current image so we can clean up the old Blob if it changes.
  const existing = await db.article.findUnique({
    where: { id },
    select: { id: true, imageUrl: true },
  });
  if (!existing) return { ok: false, error: "Article not found" };

  try {
    await db.article.update({
      where: { id },
      data: { title, summary, url, source, publishedAt, imageUrl },
    });
  } catch (error) {
    // Log server-side for diagnostics; keep the client message generic.
    console.error("updateArticle failed:", error);
    return { ok: false, error: "Could not save changes. Please try again." };
  }

  // The DB is now the source of truth. If the image URL changed (replaced or
  // removed), clean up the now-orphaned old Blob — AFTER commit, best-effort.
  const newImageUrl = imageUrl ?? null;
  if (existing.imageUrl && existing.imageUrl !== newImageUrl) {
    await deleteBlobs([existing.imageUrl]);
  }

  revalidateArticleViews();
  redirect("/admin/articles");
}

/**
 * Delete an article. No inbound foreign keys reference Article, so this is a
 * straightforward delete. Its figure Blob (if any) is cleaned up AFTER the row is
 * gone — mirroring deleteQuestion, not Atlas's leaky delete.
 */
export async function deleteArticle(id: string): Promise<ActionResult> {
  await requireAdmin();

  if (!id) return { ok: false, error: "Missing article id" };

  // Capture the image URL first — once the row is deleted we'd have no way to
  // find it for cleanup.
  const existing = await db.article.findUnique({
    where: { id },
    select: { imageUrl: true },
  });

  try {
    await db.article.delete({ where: { id } });
  } catch (error) {
    console.error("deleteArticle failed:", error);
    return { ok: false, error: "Could not delete the article." };
  }

  // After-commit Blob cleanup (best-effort, never fails the request).
  if (existing?.imageUrl) await deleteBlobs([existing.imageUrl]);

  revalidateArticleViews();
  return { ok: true };
}
