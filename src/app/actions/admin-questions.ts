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

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { questionSchema, type QuestionInput } from "@/lib/validations/question";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Throws unless the caller is a signed-in admin. Called first in every action. */
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

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
  const { stem, explanation, imageUrl, difficulty, category, choices } = parsed.data;

  await db.question.create({
    data: {
      stem,
      explanation,
      imageUrl,
      difficulty,
      category,
      choices: {
        create: choices.map((c) => ({ text: c.text, isCorrect: c.isCorrect })),
      },
    },
  });

  revalidateQuestionViews();
  redirect("/admin/questions");
}

/**
 * Update a question's scalar fields and reconcile its choices.
 *
 * Choices are diffed in place, never delete-and-recreated — recreating would
 * orphan every Attempt that points at an existing Choice (Attempt.selectedChoiceId
 * has no cascade). So:
 *   - existing choices (have an id) are updated in place (text + isCorrect),
 *   - choices without an id are created,
 *   - choices removed in the form are deleted ONLY if they have zero attempts;
 *     a removed choice that has been answered is rejected with a friendly error.
 * The whole reconciliation runs in one transaction so a mid-way failure (e.g. a
 * rejected deletion) leaves nothing half-applied.
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
  const { stem, explanation, imageUrl, difficulty, category, choices } = parsed.data;

  const existing = await db.question.findUnique({
    where: { id },
    select: { id: true, choices: { select: { id: true } } },
  });
  if (!existing) return { ok: false, error: "Question not found" };

  const existingIds = new Set(existing.choices.map((c) => c.id));
  const keptIds = new Set(
    choices.map((c) => c.id).filter((cid): cid is string => Boolean(cid)),
  );
  const removedIds = [...existingIds].filter((cid) => !keptIds.has(cid));

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
        data: { stem, explanation, imageUrl, difficulty, category },
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
    ]);
  } catch {
    return { ok: false, error: "Could not save changes. Please try again." };
  }

  revalidateQuestionViews();
  redirect("/admin/questions");
}

/**
 * Delete a question. Deleting the Question cascades its Choices AND its Attempts
 * (Attempt→Question is onDelete: Cascade), so the answered-choice FK is removed
 * as part of the same cascade — no dangling reference, no FK error.
 */
export async function deleteQuestion(id: string): Promise<ActionResult> {
  await requireAdmin();

  if (!id) return { ok: false, error: "Missing question id" };

  try {
    await db.question.delete({ where: { id } });
  } catch {
    return { ok: false, error: "Could not delete the question." };
  }

  revalidateQuestionViews();
  return { ok: true };
}
