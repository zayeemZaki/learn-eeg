import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { SectionPanel } from "@/components/ui/section-panel";

export const metadata = { title: "Admin Overview" };

/**
 * Admin overview: top-line counts plus overall accuracy and recent signups.
 *
 * Every figure is aggregated in the database (count / groupBy) — no rows are
 * pulled into JS to be tallied, and there are no per-row queries. The handful
 * of independent aggregates run together in one Promise.all round-trip.
 */
export default async function AdminOverviewPage() {
  const [
    totalUsers,
    totalQuestions,
    totalAtlasEntries,
    totalAttempts,
    correctAttempts,
    recentUsers,
    signupsThisWeek,
  ] = await Promise.all([
    db.user.count(),
    db.question.count(),
    db.atlasEntry.count(),
    db.attempt.count(),
    db.attempt.count({ where: { isCorrect: true } }),
    // Latest few signups — name + joined date only (never passwordHash).
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, createdAt: true },
    }),
    // Signups in the last 7 days. `new Date()` here is request-time on the
    // server, which is correct for "this week"; the count is done in the DB.
    db.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  // Overall accuracy across all attempts, guarding divide-by-zero.
  const accuracy =
    totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null;

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Overview" description="Activity across the platform at a glance." />

      {/* Top-line counts. Numbers emphasised, --muted labels. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total users" value={totalUsers.toLocaleString()} />
        <StatTile label="Questions" value={totalQuestions.toLocaleString()} />
        <StatTile label="Atlas entries" value={totalAtlasEntries.toLocaleString()} />
        <StatTile label="Attempts" value={totalAttempts.toLocaleString()} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Overall accuracy — the one place a thin accent bar is allowed. */}
        <StatTile
          label="Overall accuracy"
          value={accuracy !== null ? `${accuracy}%` : "—"}
          sub={
            accuracy !== null
              ? `${correctAttempts.toLocaleString()} of ${totalAttempts.toLocaleString()} correct`
              : "No attempts yet"
          }
        >
          {accuracy !== null ? (
            <div
              className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
              role="progressbar"
              aria-label="Overall accuracy"
              aria-valuenow={accuracy}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${accuracy}%` }}
              />
            </div>
          ) : null}
        </StatTile>

        {/* Recent signups: count this week + the latest few users. */}
        <SectionPanel
          title="Recent signups"
          aside={
            <>
              <span className="font-[family-name:var(--font-display)] font-bold tabular-nums text-[var(--foreground)]">
                {signupsThisWeek}
              </span>{" "}
              this week
            </>
          }
        >
          {recentUsers.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No users yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {recentUsers.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-[var(--foreground)]">
                    {user.name}
                  </span>
                  <span className="shrink-0 text-sm text-[var(--muted)] tabular-nums">
                    {dateFmt.format(user.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}
