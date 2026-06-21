import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  CheckIcon,
  CircleDashIcon,
  CrossIcon,
  ImageIcon,
} from "@/components/ui/icons";

// Filter values are driven entirely by the URL so each view is shareable and
// server-rendered. Anything else (missing or unknown) falls back to "all".
type StatusFilter = "all" | "answered" | "unanswered";

function parseStatus(raw: string | string[] | undefined): StatusFilter {
  if (raw === "answered" || raw === "unanswered") return raw;
  return "all";
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
      // Count images (the gallery relation) for the "N EEG images" indicator,
      // replacing the legacy single-imageUrl boolean.
      select: {
        id: true,
        number: true, // stable ordinal, shown as "#N"
        stem: true,
        _count: { select: { images: true } },
      },
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
    id: q.id,
    number: q.number,
    stem: q.stem,
    imageCount: q._count.images,
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
      <PageHeader title="EEG Question Bank" />

      <SegmentedTabs tabs={tabs} />

      {decorated.length === 0 ? (
        // No questions exist at all.
        <EmptyState message="No questions yet. Seed the database to add some." />
      ) : visible.length === 0 ? (
        // Questions exist, but none match the current filter.
        <EmptyState
          message={
            status === "answered"
              ? "You haven't answered any questions yet."
              : "You've answered every question — nice work."
          }
          action={{ href: "/questions", label: "View all questions" }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((q) => (
            <li key={q.id}>
              <Link
                href={`/questions/${q.id}`}
                className="group flex items-start justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 outline-none transition hover:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] motion-safe:hover:-translate-y-0.5"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  {/* Stem truncated to ~2 lines so rows stay scannable, prefixed
                      with the stable "#N" ordinal. */}
                  <p className="line-clamp-2 text-sm font-medium leading-relaxed text-[var(--foreground)]">
                    <span className="tabular-nums text-[var(--muted)]">#{q.number}</span>{" "}
                    {q.stem}
                  </p>
                  {q.imageCount > 0 ? (
                    <Badge variant="subtle" tone="neutral" icon={<ImageIcon />}>
                      {q.imageCount} EEG {q.imageCount === 1 ? "image" : "images"}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  {q.answered ? (
                    <Badge variant="subtle" tone="neutral" icon={<CheckIcon className="h-4 w-4 shrink-0" />}>
                      <span className="text-[var(--foreground)]">Answered</span>
                    </Badge>
                  ) : (
                    <Badge variant="subtle" tone="neutral" icon={<CircleDashIcon />}>
                      Not answered
                    </Badge>
                  )}
                  {/* Subtle correctness hint, icon+label so it isn't color-only. */}
                  {q.answered && q.anyCorrect !== null ? (
                    q.anyCorrect ? (
                      <Badge variant="subtle" tone="positive" icon={<CheckIcon className="h-3.5 w-3.5 shrink-0" />}>
                        Correct
                      </Badge>
                    ) : (
                      <Badge variant="subtle" tone="negative" icon={<CrossIcon className="h-3.5 w-3.5 shrink-0" />}>
                        Incorrect
                      </Badge>
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
