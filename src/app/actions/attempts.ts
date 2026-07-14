"use server";

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

  const existing = await db.attempt.findUnique({
    where: { userId_questionId: { userId, questionId } },
    select: { id: true },
  });
  if (existing) return { ok: false, error: ALREADY_ANSWERED };

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
      // Lost the race against a concurrent submit for the same question.
      return { ok: false, error: ALREADY_ANSWERED };
    }
    throw error;
  }

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
