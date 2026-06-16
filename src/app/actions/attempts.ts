"use server";

/**
 * Records a user's answer to a question and reports correctness.
 *
 * Correctness is decided server-side from the stored Choice — the client only
 * sends ids, never which option is "right", so the answer key can't be scraped
 * from the network response before answering.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const schema = z.object({
  questionId: z.string().min(1),
  choiceId: z.string().min(1),
});

export type AnswerResult =
  | { ok: true; isCorrect: boolean; correctChoiceId: string; explanation: string }
  | { ok: false; error: string };

export async function submitAnswer(raw: unknown): Promise<AnswerResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

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

  await db.attempt.create({
    data: {
      userId: session.user.id,
      questionId,
      selectedChoiceId: choiceId,
      isCorrect: selected.isCorrect,
    },
  });

  // The questions list shows per-question Answered/Not-answered status derived
  // from attempts. Recording one makes the cached list stale, so drop its
  // client router cache — otherwise a Back navigation could show the old status.
  revalidatePath("/questions");

  return {
    ok: true,
    isCorrect: selected.isCorrect,
    correctChoiceId: correct?.id ?? "",
    explanation: question.explanation,
  };
}
