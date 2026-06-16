import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EegImage } from "@/components/ui/eeg-image";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { CheckIcon } from "@/components/ui/icons";
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
      <PageHeader
        title="Question"
        back={{ href: "/questions", label: "Back to questions" }}
      />

      {previouslyAnswered ? (
        <Badge tone="neutral" icon={<CheckIcon className="h-3.5 w-3.5 shrink-0" />} className="w-fit font-medium normal-case tracking-normal text-[var(--muted)]">
          Previously answered — answer again to practice
        </Badge>
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
