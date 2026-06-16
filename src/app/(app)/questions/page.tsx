import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";

// Filter values are driven entirely by the URL so each view is shareable and
// server-rendered. Anything else (missing or unknown) falls back to "all".
type StatusFilter = "all" | "answered" | "unanswered";

function parseStatus(raw: string | string[] | undefined): StatusFilter {
  if (raw === "answered" || raw === "unanswered") return raw;
  return "all";
}

// Icon-first status markers — status is never conveyed by color alone.
function AnsweredIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UnansweredIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2.5" />
    </svg>
  );
}
function CorrectIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IncorrectIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
// "Has an EEG image" hint glyph.
function ImageIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
      <path d="M3 12l3.5-3.5 2.5 2.5 2-2 2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function QuestionsPage({
  searchParams,
}: {
  // In Next 15+/16, searchParams is async and must be awaited.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const status = parseStatus((await searchParams).status);
  const session = await auth();
  const userId = session?.user?.id;

  // ── Two queries total (no per-row work). One for the questions, one grouping
  //    the current user's attempts by (question, correctness). Grouping on the
  //    boolean (rather than max-ing it — Postgres has no max(boolean)) lets us
  //    derive both "answered" and "any attempt correct" for the subtle ✓/✗ hint
  //    without selecting per-row.
  const [questions, attemptGroups] = await Promise.all([
    db.question.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, stem: true, imageUrl: true },
    }),
    userId
      ? db.attempt.groupBy({
          by: ["questionId", "isCorrect"],
          where: { userId },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  // questionId -> "any attempt correct?" Presence of a key === answered. A
  // question may have both a correct and an incorrect group; once any group is
  // correct, the question counts as correct.
  const answeredById = new Map<string, boolean>();
  for (const g of attemptGroups) {
    answeredById.set(g.questionId, (answeredById.get(g.questionId) ?? false) || g.isCorrect);
  }

  const decorated = questions.map((q) => ({
    ...q,
    answered: answeredById.has(q.id),
    anyCorrect: answeredById.get(q.id) ?? null,
  }));

  const answeredCount = decorated.filter((q) => q.answered).length;
  const counts = {
    all: decorated.length,
    answered: answeredCount,
    unanswered: decorated.length - answeredCount,
  };

  const visible = decorated.filter((q) => {
    if (status === "answered") return q.answered;
    if (status === "unanswered") return !q.answered;
    return true;
  });

  const tabs = [
    { label: "All", href: "/questions", active: status === "all", count: counts.all },
    { label: "Answered", href: "/questions?status=answered", active: status === "answered", count: counts.answered },
    { label: "Unanswered", href: "/questions?status=unanswered", active: status === "unanswered", count: counts.unanswered },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
        EEG Question Bank
      </h1>

      <SegmentedTabs tabs={tabs} />

      {decorated.length === 0 ? (
        // No questions exist at all.
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">
          No questions yet. Seed the database to add some.
        </p>
      ) : visible.length === 0 ? (
        // Questions exist, but none match the current filter.
        <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-[var(--foreground)]">
            {status === "answered"
              ? "You haven't answered any questions yet."
              : "You've answered every question — nice work."}
          </p>
          <Link
            href="/questions"
            className="mt-2 inline-block text-sm font-medium text-[var(--accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          >
            View all questions
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((q) => (
            <li key={q.id}>
              <Link
                href={`/questions/${q.id}`}
                className="group flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 outline-none transition hover:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] motion-safe:hover:-translate-y-0.5"
              >
                <div className="min-w-0 flex flex-col gap-1.5">
                  {/* Stem truncated to ~2 lines so rows stay scannable. */}
                  <p className="line-clamp-2 text-sm font-medium leading-relaxed text-[var(--foreground)]">
                    {q.stem}
                  </p>
                  {q.imageUrl ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                      <ImageIcon />
                      Has EEG image
                    </span>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  {q.answered ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]">
                      <AnsweredIcon />
                      Answered
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
                      <UnansweredIcon />
                      Not answered
                    </span>
                  )}
                  {/* Subtle correctness hint, icon+label so it isn't color-only. */}
                  {q.answered && q.anyCorrect !== null ? (
                    q.anyCorrect ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CorrectIcon />
                        Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-red-700">
                        <IncorrectIcon />
                        Incorrect
                      </span>
                    )
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
