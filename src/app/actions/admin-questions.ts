"use server";

/**
 * Admin question CRUD. Each action is an independently-invocable public endpoint,
 * so the route/page guard is NOT sufficient: every action re-checks role ===
 * "ADMIN" at the very top (requireAdmin) and re-validates its input with the
 * shared zod schema before touching the database. Never trust the client.
 *
 * After any mutation we revalidate both the admin list and the PUBLIC questions
 * list so the change is reflected everywhere immediately.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { deleteBlobs } from "@/lib/blob-cleanup";
import { questionSchema, type QuestionInput } from "@/lib/validations/question";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Drop the caches that show questions: the admin list and the public list. */
function revalidateQuestionViews() {
  revalidatePath("/admin/questions");
  revalidatePath("/questions");
}

/**
 * Create a question and its choices in one nested write. Redirects to the admin
 * list on success; returns a field-style error on validation failure.
 */
export async function createQuestion(raw: QuestionInput): Promise<ActionResult> {
  await requireAdmin();

  const parsed = questionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { stem, explanation, difficulty, category, choices, images } = parsed.data;

  await db.question.create({
    data: {
      stem,
      explanation,
      // imageUrl is deprecated — new questions leave it null and use `images`.
      difficulty,
      category,
      choices: {
        create: choices.map((c) => ({ text: c.text, isCorrect: c.isCorrect })),
      },
      // Mirror the choices nested-create; the array index becomes the stable
      // gallery position.
      images: {
        create: images.map((img, i) => ({
          url: img.url,
          alt: img.alt,
          position: i,
        })),
      },
    },
  });

  revalidateQuestionViews();
  redirect("/admin/questions");
}

/**
 * Update a question's scalar fields and reconcile its choices AND its images.
 *
 * Choices are diffed in place, never delete-and-recreated — recreating would
 * orphan every Attempt that points at an existing Choice (Attempt.selectedChoiceId
 * has no cascade). So:
 *   - existing choices (have an id) are updated in place (text + isCorrect),
 *   - choices without an id are created,
 *   - choices removed in the form are deleted ONLY if they have zero attempts;
 *     a removed choice that has been answered is rejected with a friendly error.
 *
 * Images are reconciled by URL (the form sends no ids; each Blob URL is unique
 * because the upload route adds a random suffix, so URL is a safe identity key):
 *   - an image whose URL still exists is updated in place (alt + new position),
 *   - a URL not previously present is created,
 *   - a previously-present URL now absent is deleted, and its Blob object is
 *     cleaned up AFTER the transaction commits (see the deleteBlobs call).
 * Images have no Attempt FK, so removal is always allowed (unlike choices).
 *
 * The whole reconciliation runs in one transaction so a mid-way failure leaves
 * nothing half-applied. Blob cleanup runs only after that commit and never fails
 * the request.
 */
export async function updateQuestion(
  id: string,
  raw: QuestionInput,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = questionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { stem, explanation, difficulty, category, choices, images } = parsed.data;

  const existing = await db.question.findUnique({
    where: { id },
    select: {
      id: true,
      choices: { select: { id: true } },
      images: { select: { id: true, url: true } },
    },
  });
  if (!existing) return { ok: false, error: "Question not found" };

  const existingIds = new Set(existing.choices.map((c) => c.id));
  const keptIds = new Set(
    choices.map((c) => c.id).filter((cid): cid is string => Boolean(cid)),
  );
  const removedIds = [...existingIds].filter((cid) => !keptIds.has(cid));

  // ── Image reconcile plan (by URL). ──────────────────────────────────────────
  // Map URL → existing row id so kept images can be updated in place.
  const existingImageIdByUrl = new Map(existing.images.map((img) => [img.url, img.id]));
  const submittedUrls = new Set(images.map((img) => img.url));
  // Rows whose URL is no longer submitted → delete (and clean up their Blobs).
  const removedImages = existing.images.filter((img) => !submittedUrls.has(img.url));
  const removedImageIds = removedImages.map((img) => img.id);
  const removedImageUrls = removedImages.map((img) => img.url);

  // Footgun guard: a removed choice that has attempts can't be deleted (FK has
  // no cascade), and silently keeping it would be surprising. Reject with a
  // message that tells the admin what to do instead.
  if (removedIds.length > 0) {
    const answered = await db.attempt.findFirst({
      where: { selectedChoiceId: { in: removedIds } },
      select: { id: true },
    });
    if (answered) {
      return {
        ok: false,
        error:
          "This option has been answered by users and can't be removed; edit its text instead.",
      };
    }
  }

  try {
    await db.$transaction([
      db.question.update({
        where: { id },
        // imageUrl is deprecated and intentionally not written here (kept as-is
        // on legacy rows until a later pass drops the column).
        data: { stem, explanation, difficulty, category },
      }),
      // Delete first (only the safe-to-remove ids verified above).
      ...(removedIds.length > 0
        ? [db.choice.deleteMany({ where: { id: { in: removedIds } } })]
        : []),
      // Update existing choices in place.
      ...choices
        .filter((c) => c.id && existingIds.has(c.id))
        .map((c) =>
          db.choice.update({
            where: { id: c.id },
            data: { text: c.text, isCorrect: c.isCorrect },
          }),
        ),
      // Create brand-new choices.
      ...choices
        .filter((c) => !c.id)
        .map((c) =>
          db.choice.create({
            data: { questionId: id, text: c.text, isCorrect: c.isCorrect },
          }),
        ),

      // ── Images, reconciled by URL. ──────────────────────────────────────────
      // Delete rows whose URL is gone (Blob cleanup happens after commit).
      ...(removedImageIds.length > 0
        ? [db.questionImage.deleteMany({ where: { id: { in: removedImageIds } } })]
        : []),
      // For each submitted image, update in place if its URL already exists
      // (refresh alt + position), else create it. Index = stable gallery order.
      ...images.map((img, i) => {
        const existingId = existingImageIdByUrl.get(img.url);
        return existingId
          ? db.questionImage.update({
              where: { id: existingId },
              data: { alt: img.alt, position: i },
            })
          : db.questionImage.create({
              data: { questionId: id, url: img.url, alt: img.alt, position: i },
            });
      }),
    ]);
  } catch (error) {
    // Log server-side for diagnostics; keep the client message generic (never
    // leak DB/Prisma details to the user).
    console.error("updateQuestion failed:", error);
    return { ok: false, error: "Could not save changes. Please try again." };
  }

  // The DB is now the source of truth. Clean up Blob objects for removed images
  // AFTER the commit; deleteBlobs never throws, so a Blob failure can't fail this
  // save (a leaked object is recoverable; a failed user action is worse).
  await deleteBlobs(removedImageUrls);

  revalidateQuestionViews();
  redirect("/admin/questions");
}

/**
 * Delete a question. Deleting the Question cascades its Choices, its Attempts, AND
 * its QuestionImage rows (all onDelete: Cascade), so the answered-choice FK is
 * removed as part of the same cascade — no dangling reference, no FK error.
 *
 * The DB cascade does NOT touch Blob storage, so we collect this question's image
 * URLs BEFORE deleting and clean up those Blob objects AFTER the delete commits.
 * deleteBlobs never throws, so a Blob failure can't fail the delete (the row is
 * already gone; a leaked object is recoverable).
 */
export async function deleteQuestion(id: string): Promise<ActionResult> {
  await requireAdmin();

  if (!id) return { ok: false, error: "Missing question id" };

  // Capture image URLs first — once the row is deleted (and its images cascaded
  // away) we'd have no way to find them.
  const imageUrls = (
    await db.questionImage.findMany({
      where: { questionId: id },
      select: { url: true },
    })
  ).map((img) => img.url);

  try {
    await db.question.delete({ where: { id } });
  } catch (error) {
    console.error("deleteQuestion failed:", error);
    return { ok: false, error: "Could not delete the question." };
  }

  // After-commit Blob cleanup (best-effort, never fails the request).
  await deleteBlobs(imageUrls);

  revalidateQuestionViews();
  return { ok: true };
}
