import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DifficultyMeter } from "@/components/ui/difficulty-meter";
import { QuestionAnswer, type ClientQuestion } from "./question-answer";
import { QuestionGallery } from "./question-gallery";

// In Next 15+/16, dynamic params are async and must be awaited.
export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // SECURITY BOUNDARY: `choices` carries `isCorrect` here (needed to derive the
  // correct-choice id for an ALREADY-answered question below), but it is NEVER
  // shipped raw to the client — `clientQuestion.choices` is rebuilt from an
  // explicit { id, text } map further down, so `isCorrect` can't leak for an
  // unanswered question. Images are selected ALONGSIDE choices (a separate
  // relation); adding them does NOT change the choices select.
  const question = await db.question.findUnique({
    where: { id },
    select: {
      id: true,
      number: true, // stable ordinal — surfaced as "Question #N" (just an ordinal)
      difficulty: true,
      stem: true,
      explanation: true,
      choices: { select: { id: true, text: true, isCorrect: true } },
      images: {
        select: { url: true, alt: true },
        orderBy: { position: "asc" },
      },
      // DEPRECATED legacy single-image column, selected ONLY to synthesize a
      // fallback gallery entry below for questions authored before the multi-image
      // cutover (relation empty, legacy column set). It is never shipped as a raw
      // client field — it's consumed only to build `images` — so the boundary is
      // unchanged. Remove this once the column is dropped.
      imageUrl: true,
    },
  });
  if (!question) notFound();

  // Build the gallery images from the relation. During the deprecation window a
  // legacy-only question may have an empty relation but a populated imageUrl — in
  // that case synthesize a single fallback entry so no image silently disappears.
  // (New data lives entirely in the relation, so this branch is dead for it.)
  const images =
    question.images.length === 0 && question.imageUrl
      ? [{ url: question.imageUrl, alt: null }]
      : question.images;

  // Single-attempt model: if this user already answered, load that Attempt so
  // the client can render the result view directly instead of the answer form.
  // The correct choice id is safe to send here — the user has already answered,
  // so it's no longer an answer key that could be scraped before answering.
  const session = await auth();
  const existingAttempt = session?.user?.id
    ? await db.attempt.findFirst({
        where: { userId: session.user.id, questionId: id },
        select: { selectedChoiceId: true, isCorrect: true },
      })
    : null;

  const correctChoice = question.choices.find((c) => c.isCorrect);

  // Explicit client shape — guarantees no extra fields leak across the boundary.
  // Every field is named explicitly (never a spread), so isCorrect / explanation
  // can't ride along for an UNANSWERED question; images carry only { url, alt }
  // (the legacy imageUrl is consumed only to build `images` above, never shipped
  // as a raw field). Choices never carry `isCorrect` itself — only the derived
  // correctChoiceId below, and only once the question has already been answered.
  const clientQuestion: ClientQuestion = {
    id: question.id,
    number: question.number,
    difficulty: question.difficulty,
    stem: question.stem,
    choices: question.choices.map(({ id, text }) => ({ id, text })),
    images,
    priorAnswer: existingAttempt
      ? {
          selectedChoiceId: existingAttempt.selectedChoiceId,
          isCorrect: existingAttempt.isCorrect,
          correctChoiceId: correctChoice?.id ?? "",
          explanation: question.explanation,
        }
      : null,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Question"
        back={{ href: "/questions", label: "Back to questions" }}
      />

      <Card>
        {/* Stable, system-assigned ordinal — read-only, just a "Question #N" label. */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Question #{clientQuestion.number}
          </p>
          <DifficultyMeter difficulty={clientQuestion.difficulty} />
        </div>
        <p className="mt-1 text-base font-medium leading-relaxed">{clientQuestion.stem}</p>
        {/* Gallery + click-to-zoom lightbox; renders nothing when there are no images. */}
        <QuestionGallery images={clientQuestion.images} />
      </Card>

      <QuestionAnswer question={clientQuestion} />
    </div>
  );
}
