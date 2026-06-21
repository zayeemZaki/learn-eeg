import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { CheckIcon } from "@/components/ui/icons";
import { QuestionAnswer, type ClientQuestion } from "./question-answer";
import { QuestionGallery } from "./question-gallery";

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
  // Images are selected ALONGSIDE choices (a separate relation); adding them does
  // NOT change the choices select, so the boundary is unaffected.
  const question = await db.question.findUnique({
    where: { id },
    select: {
      id: true,
      number: true, // stable ordinal — surfaced as "Question #N" (just an ordinal)
      stem: true,
      choices: { select: { id: true, text: true } },
      images: {
        select: { url: true, alt: true },
        orderBy: { position: "asc" },
      },
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
  // Every field is named explicitly (never a spread), so isCorrect / explanation
  // can't ride along; images carry only { url, alt }.
  const clientQuestion: ClientQuestion = {
    id: question.id,
    number: question.number,
    stem: question.stem,
    choices: question.choices,
    images: question.images,
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
        {/* Stable, system-assigned ordinal — read-only, just a "Question #N" label. */}
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Question #{clientQuestion.number}
        </p>
        <p className="mt-1 text-base font-medium leading-relaxed">{clientQuestion.stem}</p>
        {/* Gallery + click-to-zoom lightbox; renders nothing when there are no images. */}
        <QuestionGallery images={clientQuestion.images} />
      </Card>

      <QuestionAnswer question={clientQuestion} />
    </div>
  );
}
