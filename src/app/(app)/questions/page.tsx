import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Pager } from "@/components/ui/pager";
import { CONTENT_PAGE_SIZE, pageInfo, resolvePage } from "@/lib/pagination";

/**
 * Hard ceiling on questions loaded to build this list.
 *
 * The Answered/Unanswered filter depends on the viewer's own attempts, so it is
 * applied in JS (see the note by the slice below) — which means the rows have to be
 * in memory before they can be filtered and paged. This cap is what keeps that
 * bounded. It is set far above the realistic size of a curated teaching bank; if
 * the bank ever approaches it, the filter needs to move into SQL as a join against
 * the user's attempts, and this list to a cursor.
 */
const MAX_LISTED_QUESTIONS = 1000;
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
  const params = await searchParams;
  const status = parseStatus(params.status);
  const page = resolvePage(params.page, CONTENT_PAGE_SIZE);
  const session = await auth();
  const userId = session?.user?.id;

  // ── Two queries total (no per-row work). One for the questions, one for the
  //    current user's attempts. A user has at most ONE attempt per question
  //    (Attempt carries @@unique([userId, questionId])), so this is a flat
  //    questionId → isCorrect lookup: no grouping, and no "any attempt correct"
  //    fold, because there is only ever one attempt to consult.
  const [questions, attempts] = await Promise.all([
    db.question.findMany({
      orderBy: { createdAt: "asc" },
      take: MAX_LISTED_QUESTIONS,
      // Count images (the gallery relation) for the "N EEG images" indicator,
      // replacing the legacy single-imageUrl boolean. imageUrl is also selected so
      // a legacy-only question (empty relation, populated legacy column) still
      // counts as 1 during the deprecation window — see imageCount below.
      select: {
        id: true,
        number: true, // stable ordinal, shown as "#N"
        stem: true,
        imageUrl: true,
        _count: { select: { images: true } },
      },
    }),
    userId
      ? db.attempt.findMany({
          where: { userId },
          select: { questionId: true, isCorrect: true },
        })
      : Promise.resolve([]),
  ]);

  // questionId -> was it answered correctly. Presence of a key === answered.
  const answeredById = new Map(attempts.map((a) => [a.questionId, a.isCorrect]));

  const decorated = questions.map((q) => ({
    id: q.id,
    number: q.number,
    stem: q.stem,
    // Relation count, but never below 1 for a legacy-only question (empty
    // relation + populated legacy imageUrl) so the indicator matches the loader.
    imageCount: q._count.images > 0 ? q._count.images : q.imageUrl ? 1 : 0,
    answered: answeredById.has(q.id),
    isCorrect: answeredById.get(q.id) ?? null,
  }));

  const answeredCount = decorated.filter((q) => q.answered).length;
  const counts = {
    all: decorated.length,
    answered: answeredCount,
    unanswered: decorated.length - answeredCount,
  };

  const matching = decorated.filter((q) => {
    if (status === "answered") return q.answered;
    if (status === "unanswered") return !q.answered;
    return true;
  });

  // The Answered/Unanswered filter is a property of THIS user's attempts, not of
  // the question row, so it cannot be expressed as a `where` on the question query
  // without a per-user join; the filter therefore stays in JS and the page window
  // is applied to its result. The two queries above are already bounded (questions
  // are capped by MAX_LISTED_QUESTIONS, attempts by one row per answered question),
  // so this slices an in-memory list rather than growing the query.
  const info = pageInfo(page, matching.length);
  const visible = matching.slice(page.skip, page.skip + page.take);

  // Paging must PRESERVE the status filter.
  const hrefForPage = (next: number) => {
    const query = new URLSearchParams();
    if (status !== "all") query.set("status", status);
    query.set("page", String(next));
    return `/questions?${query.toString()}`;
  };

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
                className="group flex items-start justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs outline-none transition duration-200 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] motion-safe:hover:-translate-y-0.5"
              >
                <div className="flex min-w-0 flex-col gap-2">
                  {/* Clamped to 2 lines so rows stay scannable. */}
                  <p className="line-clamp-2 text-base font-medium leading-relaxed text-[var(--foreground)]">
                    <span className="tabular-nums font-normal text-[var(--muted)]">#{q.number}</span>{" "}
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
                  {q.answered && q.isCorrect !== null ? (
                    q.isCorrect ? (
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

      <Pager info={info} hrefForPage={hrefForPage} itemLabel="questions" />
    </div>
  );
}
