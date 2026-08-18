"use server";

/**
 * Recording a practice answer — the app's only user-facing write.
 *
 * Like every server action here it is an independently-invocable public endpoint,
 * so it re-checks auth itself (requireUser) and derives the actor from the session
 * rather than the payload: the client sends only a question + choice, never a user
 * id, so a crafted request cannot log an attempt as somebody else.
 *
 * CORRECTNESS IS DECIDED SERVER-SIDE. The client is told which choice was right
 * only in the response, after the write — the answer key never ships with the
 * question (see the SECURITY BOUNDARY note in questions/[id]/page.tsx).
 *
 * ONE ATTEMPT PER QUESTION, enforced by @@unique([userId, questionId]) rather than
 * by a read-then-write: the insert itself is the guard, and its P2002 violation is
 * what "already answered" means.
 */
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";

const schema = z.object({
  questionId: z.string().min(1),
  choiceId: z.string().min(1),
});

export type AnswerResult =
  | { ok: true; isCorrect: boolean; correctChoiceId: string; explanation: string }
  | { ok: false; error: string };

const ALREADY_ANSWERED = "You have already answered this question";

export async function submitAnswer(raw: unknown): Promise<AnswerResult> {
  const session = await requireUser();
  const userId = session.user.id;

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { questionId, choiceId } = parsed.data;

  const question = await db.question.findUnique({
    where: { id: questionId },
    include: { choices: true },
  });
  if (!question) return { ok: false, error: "Question not found" };

  const selected = question.choices.find((c) => c.id === choiceId);
  if (!selected) return { ok: false, error: "Choice does not belong to question" };

  const correct = question.choices.find((c) => c.isCorrect);

  // One attempt per question is enforced by @@unique([userId, questionId]), so
  // the insert IS the check — a pre-read would only add a round-trip and could
  // still be raced. The P2002 branch below is the single, authoritative gate.
  try {
    await db.attempt.create({
      data: {
        userId,
        questionId,
        selectedChoiceId: choiceId,
        isCorrect: selected.isCorrect,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: ALREADY_ANSWERED };
    }
    throw error;
  }

  // Both views derive from attempts and are now stale: the questions list shows
  // per-question Answered/Not-answered status, and the dashboard's every figure
  // comes from this user's attempts. Dropping both router caches keeps a Back
  // navigation (or a click straight to the dashboard) from showing pre-answer
  // state.
  revalidatePath("/questions");
  revalidatePath("/dashboard");

  return {
    ok: true,
    isCorrect: selected.isCorrect,
    correctChoiceId: correct?.id ?? "",
    explanation: question.explanation,
  };
}
