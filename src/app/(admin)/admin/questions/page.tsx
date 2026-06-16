import Link from "next/link";

import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteQuestionButton } from "@/components/admin/delete-question-button";

export const metadata = { title: "Questions" };

/** Small inline glyph marking a question that has an EEG image attached. */
function ImageIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
      <path d="M3 12l3.5-3.5 2.5 2.5 2-2 2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Admin questions list: every question with a stem preview, option count,
 * has-image indicator, and attempt count, plus per-row Edit/Delete and a
 * "New question" button.
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
        imageUrl: true,
        difficulty: true,
        _count: { select: { choices: true } },
      },
    }),
    db.attempt.groupBy({ by: ["questionId"], _count: { _all: true } }),
  ]);

  const attemptsByQuestion = new Map(
    attemptGroups.map((g) => [g.questionId, g._count._all]),
  );

  const rows = questions.map((q) => ({
    id: q.id,
    stem: q.stem,
    hasImage: Boolean(q.imageUrl),
    choices: q._count.choices,
    difficulty: q.difficulty,
    attempts: attemptsByQuestion.get(q.id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            Questions
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            {rows.length} {rows.length === 1 ? "question" : "questions"}.
          </p>
        </div>
        <Link href="/admin/questions/new">
          <Button>New question</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">
          No questions yet. Create the first one.
        </p>
      ) : (
        <>
          {/* Mobile: one card per question. */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {rows.map((q) => (
              <li key={q.id}>
                <Card className="flex flex-col gap-3">
                  <p className="line-clamp-3 text-sm font-medium text-[var(--foreground)]">
                    {q.stem}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
                    <span className="tabular-nums">{q.choices} options</span>
                    <span className="tabular-nums">{q.attempts} attempts</span>
                    <span className="tabular-nums">Difficulty {q.difficulty}</span>
                    {q.hasImage ? (
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon />
                        Image
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                    <Link href={`/admin/questions/${q.id}/edit`}>
                      <Button variant="ghost">Edit</Button>
                    </Link>
                    <DeleteQuestionButton id={q.id} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          {/* sm+: a table, horizontally scrollable inside its bordered surface. */}
          <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] sm:block">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                  <th scope="col" className="px-4 py-3 font-medium">Question</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Options</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Image</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Attempts</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Difficulty</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="max-w-md px-4 py-3">
                      <span className="line-clamp-2 font-medium text-[var(--foreground)]">
                        {q.stem}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{q.choices}</td>
                    <td className="px-4 py-3 text-center">
                      {q.hasImage ? (
                        <span className="inline-flex items-center gap-1 text-[var(--muted)]">
                          <ImageIcon />
                          <span className="sr-only">Has image</span>
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]" aria-label="No image">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{q.attempts}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{q.difficulty}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/questions/${q.id}/edit`}>
                          <Button variant="ghost">Edit</Button>
                        </Link>
                        <DeleteQuestionButton id={q.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
