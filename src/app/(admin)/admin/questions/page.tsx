import Link from "next/link";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Pager } from "@/components/ui/pager";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "@/components/ui/icons";
import { DifficultyMeter } from "@/components/ui/difficulty-meter";
import { QuestionCategoryBadge } from "@/components/ui/question-category-badge";
import { type QuestionCategory } from "@prisma/client";
import { ADMIN_PAGE_SIZE, pageInfo, resolvePage } from "@/lib/pagination";

export const metadata = { title: "Questions" };

interface QuestionRow {
  id: string;
  number: number;
  stem: string;
  imageCount: number;
  choices: number;
  difficulty: number;
  category: QuestionCategory;
  attempts: number;
}

/**
 * Admin questions list: every question with a stem preview, option count,
 * has-image indicator, and attempt count, plus a "New question" button. The
 * whole row links to the editor; deletion now lives on that edit page (a
 * trash-icon "Danger zone"), so the list carries no per-row delete. Rendered
 * through the shared DataTable (stacked cards on mobile, a scrollable table from
 * sm up).
 *
 * Three queries, no N+1: one findMany for the page's questions (with a `_count`
 * of choices), one total count for the pager, and one groupBy counting attempts —
 * scoped to the question ids ON THIS PAGE, so neither the row fetch nor the
 * aggregate grows with the table. Joined in memory via a Map. Reading isCorrect is
 * irrelevant here (not selected); this is an admin-only view.
 */
export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const page = resolvePage((await searchParams).page, ADMIN_PAGE_SIZE);

  const [questions, totalQuestions] = await Promise.all([
    db.question.findMany({
      orderBy: { createdAt: "desc" },
      skip: page.skip,
      take: page.take,
      select: {
        id: true,
        number: true, // stable ordinal, shown as "#N" (system-assigned, read-only)
        stem: true,
        difficulty: true,
        category: true,
        // Legacy single-image column — selected so a legacy-only question still
        // counts as 1 image during the deprecation window (see imageCount below).
        imageUrl: true,
        // Count both relations: choices (unchanged) and images (gallery).
        _count: { select: { choices: true, images: true } },
      },
    }),
    db.question.count(),
  ]);

  // Attempt counts only for the rows we are about to render.
  const attemptGroups = await db.attempt.groupBy({
    by: ["questionId"],
    where: { questionId: { in: questions.map((q) => q.id) } },
    _count: { _all: true },
  });

  const attemptsByQuestion = new Map(
    attemptGroups.map((g) => [g.questionId, g._count._all]),
  );

  const info = pageInfo(page, totalQuestions);

  const rows: QuestionRow[] = questions.map((q) => ({
    id: q.id,
    number: q.number,
    stem: q.stem,
    // Relation count, floored at 1 for a legacy-only question (empty relation +
    // populated legacy imageUrl) so the count matches what the answer page shows.
    imageCount: q._count.images > 0 ? q._count.images : q.imageUrl ? 1 : 0,
    choices: q._count.choices,
    difficulty: q.difficulty,
    category: q.category,
    attempts: attemptsByQuestion.get(q.id) ?? 0,
  }));

  // Shared "images" cell — an icon + count (with an SR label) or an em dash.
  const imageCell = (q: QuestionRow) =>
    q.imageCount > 0 ? (
      <span className="inline-flex items-center gap-1 text-[var(--muted)]">
        <ImageIcon />
        <span className="tabular-nums">{q.imageCount}</span>
        <span className="sr-only">
          {q.imageCount === 1 ? "image" : "images"}
        </span>
      </span>
    ) : (
      <span className="text-[var(--muted)]" aria-label="No images">
        —
      </span>
    );

  const columns: Column<QuestionRow>[] = [
    {
      header: "#",
      align: "right",
      cell: (q) => (
        <span className="tabular-nums text-[var(--muted)]">#{q.number}</span>
      ),
    },
    {
      header: "Question",
      className: "max-w-md",
      cell: (q) => (
        <span className="line-clamp-2 font-medium text-[var(--foreground)]">{q.stem}</span>
      ),
    },
    { header: "Options", align: "right", cell: (q) => <span className="tabular-nums">{q.choices}</span> },
    { header: "Images", align: "center", cell: imageCell },
    { header: "Category", cell: (q) => <QuestionCategoryBadge category={q.category} /> },
    { header: "Attempts", align: "right", cell: (q) => <span className="tabular-nums">{q.attempts}</span> },
    { header: "Difficulty", align: "right", cell: (q) => <DifficultyMeter difficulty={q.difficulty} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Questions"
        description={`${totalQuestions.toLocaleString()} ${
          totalQuestions === 1 ? "question" : "questions"
        }.`}
        actions={
          <Link href="/admin/questions/new">
            <Button>New question</Button>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState message="No questions yet. Create the first one." />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(q) => q.id}
          rowHref={(q) => `/admin/questions/${q.id}/edit`}
          rowLabel={(q) => `Edit question: ${q.stem}`}
          renderCard={(q) => (
            // The whole card is the tap target → edit; deletion lives on the
            // edit page, so the card carries no delete control.
            <Card>
              <Link
                href={`/admin/questions/${q.id}/edit`}
                aria-label={`Edit question: ${q.stem}`}
                className="-m-1 flex flex-col gap-3 rounded-lg p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <p className="line-clamp-3 text-sm font-medium text-[var(--foreground)]">
                  <span className="tabular-nums text-[var(--muted)]">#{q.number}</span>{" "}
                  {q.stem}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                  <span className="tabular-nums">{q.choices} options</span>
                  <span className="tabular-nums">{q.attempts} attempts</span>
                  <DifficultyMeter difficulty={q.difficulty} />
                  <QuestionCategoryBadge category={q.category} />
                  {q.imageCount > 0 ? (
                    <Badge variant="subtle" tone="neutral" icon={<ImageIcon />}>
                      {q.imageCount} {q.imageCount === 1 ? "image" : "images"}
                    </Badge>
                  ) : null}
                </div>
              </Link>
            </Card>
          )}
        />
      )}

      <Pager
        info={info}
        hrefForPage={(p) => `/admin/questions?page=${p}`}
        itemLabel="questions"
      />
    </div>
  );
}
