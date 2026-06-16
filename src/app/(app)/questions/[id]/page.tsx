import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EegImage } from "@/components/ui/eeg-image";
import { QuestionAnswer, type ClientQuestion } from "./question-answer";

// In Next 15+/16, dynamic params are async and must be awaited.
export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // SECURITY BOUNDARY: choices are selected as { id, text } ONLY. `isCorrect`
  // is never read here, so it can never be serialized into the client props —
  // correctness comes back exclusively from submitAnswer after the user answers.
  const question = await db.question.findUnique({
    where: { id },
    select: {
      id: true,
      stem: true,
      imageUrl: true,
      choices: { select: { id: true, text: true } },
    },
  });
  if (!question) notFound();

  // Whether this user answered in a prior session — for the "Previously
  // answered" badge only. One cheap existence check; it does not gate answering
  // (retry model: the question is always presented answerable).
  const session = await auth();
  const previouslyAnswered = session?.user?.id
    ? (await db.attempt.count({
        where: { userId: session.user.id, questionId: id },
      })) > 0
    : false;

  // Explicit client shape — guarantees no extra fields leak across the boundary.
  const clientQuestion: ClientQuestion = {
    id: question.id,
    stem: question.stem,
    imageUrl: question.imageUrl,
    choices: question.choices,
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/questions"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
          <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to questions
      </Link>

      {previouslyAnswered ? (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
            <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Previously answered — answer again to practice
        </span>
      ) : null}

      <Card>
        <p className="text-base font-medium leading-relaxed">{clientQuestion.stem}</p>
        {clientQuestion.imageUrl ? (
          <EegImage src={clientQuestion.imageUrl} alt="EEG trace for this question" className="mt-4" />
        ) : null}
      </Card>

      <QuestionAnswer question={clientQuestion} />
    </div>
  );
}
