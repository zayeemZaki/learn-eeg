import Link from "next/link";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "@/components/ui/icons";

export const metadata = { title: "Questions" };

interface QuestionRow {
  id: string;
  stem: string;
  imageCount: number;
  choices: number;
  difficulty: number;
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
 * Two queries, no N+1: one findMany with a `_count` of choices, and one groupBy
 * that counts attempts per question, joined in memory via a Map. Reading
 * isCorrect is irrelevant here (not selected); this is an admin-only view.
 */
export default async function AdminQuestionsPage() {
  const [questions, attemptGroups] = await Promise.all([
    db.question.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        stem: true,
        difficulty: true,
        // Count both relations: choices (unchanged) and images (gallery).
        _count: { select: { choices: true, images: true } },
      },
    }),
    db.attempt.groupBy({ by: ["questionId"], _count: { _all: true } }),
  ]);

  const attemptsByQuestion = new Map(
    attemptGroups.map((g) => [g.questionId, g._count._all]),
  );

  const rows: QuestionRow[] = questions.map((q) => ({
    id: q.id,
    stem: q.stem,
    imageCount: q._count.images,
    choices: q._count.choices,
    difficulty: q.difficulty,
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
      header: "Question",
      className: "max-w-md",
      cell: (q) => (
        <span className="line-clamp-2 font-medium text-[var(--foreground)]">{q.stem}</span>
      ),
    },
    { header: "Options", align: "right", cell: (q) => <span className="tabular-nums">{q.choices}</span> },
    { header: "Images", align: "center", cell: imageCell },
    { header: "Attempts", align: "right", cell: (q) => <span className="tabular-nums">{q.attempts}</span> },
    { header: "Difficulty", align: "right", cell: (q) => <span className="tabular-nums">{q.difficulty}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Questions"
        description={`${rows.length} ${rows.length === 1 ? "question" : "questions"}.`}
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
                <p className="line-clamp-3 text-sm font-medium text-[var(--foreground)]">{q.stem}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                  <span className="tabular-nums">{q.choices} options</span>
                  <span className="tabular-nums">{q.attempts} attempts</span>
                  <span className="tabular-nums">Difficulty {q.difficulty}</span>
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
    </div>
  );
}
