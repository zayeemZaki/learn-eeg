import {
  getAdminTotals,
  getAdminTrends,
  getHardestContent,
  getCoverage,
  getAdminActivity,
  type HardestQuestion,
  type UserActivityRow,
} from "@/lib/stats";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { SectionPanel } from "@/components/ui/section-panel";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { LineTrend } from "@/components/charts/line-trend";
import { BarBreakdown } from "@/components/charts/bar-breakdown";
import { RadialAccuracy } from "@/components/charts/radial-accuracy";

export const metadata = { title: "Admin Overview" };

const TREND_DAYS = 30;
const HARDEST_LIMIT = 8;
const ACTIVITY_LIMIT = 5;

/**
 * Admin analytics overview. EVERY figure is computed in stats.ts (server-side)
 * and routed through the one shared latest-per-question accuracy definition, so
 * the admin "overall accuracy" matches what each user sees. No N+1: each helper
 * issues batched queries and reduces in JS. Only computed numbers/labels reach
 * the client — no passwordHash, no raw isCorrect rows.
 *
 * The page itself sits under (admin)/admin/ and is therefore already guarded by
 * the admin layout (edge + server re-check); no extra guard here.
 */
export default async function AdminOverviewPage() {
  const now = new Date();

  const [totals, trends, hardest, coverage, activity] = await Promise.all([
    getAdminTotals(),
    getAdminTrends(now, TREND_DAYS),
    getHardestContent(1, HARDEST_LIMIT),
    getCoverage(),
    getAdminActivity(ACTIVITY_LIMIT),
  ]);

  const { accuracy } = totals;
  const hasAttempts = totals.attempts > 0;

  // Hardest categories → percentage bars (only categories with any attempts).
  const hardestCategoryBars = hardest.categories
    .filter((c) => c.accuracy.percent != null)
    .map((c) => ({
      label: c.label,
      value: c.accuracy.percent ?? 0,
      hint: `${c.accuracy.correct} of ${c.accuracy.total} correct`,
    }));

  // Content coverage bars: questions per category (counts, not percentages).
  const questionsByCategoryBars = coverage.questionsByCategory.map((c) => ({
    label: c.label,
    value: c.count,
  }));

  const hardestColumns: Column<HardestQuestion>[] = [
    {
      header: "Question",
      className: "max-w-md",
      cell: (q) => (
        <span className="line-clamp-2 font-medium text-[var(--foreground)]">{q.stem}</span>
      ),
    },
    {
      header: "Category",
      cell: (q) => (
        <Badge tone="neutral" variant="subtle">
          {q.categoryLabel}
        </Badge>
      ),
    },
    {
      header: "Answered by",
      align: "right",
      cell: (q) => <span className="tabular-nums">{q.accuracy.total}</span>,
    },
    {
      header: "Accuracy",
      align: "right",
      cell: (q) => (
        <Badge tone={(q.accuracy.percent ?? 0) < 50 ? "negative" : "neutral"}>
          {q.accuracy.percent != null ? `${q.accuracy.percent}%` : "—"}
        </Badge>
      ),
    },
  ];

  const activityColumns: Column<UserActivityRow>[] = [
    {
      header: "User",
      cell: (u) => <span className="font-medium text-[var(--foreground)]">{u.name}</span>,
    },
    {
      header: "Attempts",
      align: "right",
      cell: (u) => <span className="tabular-nums">{u.attempts}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Overview" description="Activity across the platform at a glance." />

      {/* Top-line counts. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total users" value={totals.users.toLocaleString()} />
        <StatTile label="Questions" value={totals.questions.toLocaleString()} />
        <StatTile label="Atlas entries" value={totals.atlasEntries.toLocaleString()} />
        <StatTile label="Attempts" value={totals.attempts.toLocaleString()} />
      </div>

      {/* Overall accuracy gauge + the two trend lines. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionPanel title="Overall accuracy" className="lg:col-span-1">
          <RadialAccuracy percent={accuracy.percent} ariaLabel="Overall platform accuracy" />
          <p className="mt-2 text-center text-sm text-[var(--muted)]">
            {hasAttempts
              ? `Latest answer per user per question · ${accuracy.correct} of ${accuracy.total} correct`
              : "No attempts yet"}
          </p>
        </SectionPanel>

        <SectionPanel title={`Signups · last ${TREND_DAYS} days`} className="lg:col-span-1">
          <LineTrend data={trends.signups} ariaLabel="Daily signups over the last 30 days" height={180} />
        </SectionPanel>

        <SectionPanel title={`Attempts · last ${TREND_DAYS} days`} className="lg:col-span-1">
          <LineTrend data={trends.attempts} ariaLabel="Daily attempts over the last 30 days" height={180} />
        </SectionPanel>
      </div>

      {/* Hardest questions table + hardest categories bars. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel title="Hardest questions" aside="lowest accuracy">
          {hardest.questions.length === 0 ? (
            <EmptyState message="No answered questions yet." />
          ) : (
            <DataTable
              columns={hardestColumns}
              rows={hardest.questions}
              rowKey={(q) => q.id}
              minWidthClass="min-w-[34rem]"
              renderCard={(q) => (
                <Card className="flex flex-col gap-2">
                  <p className="line-clamp-3 text-sm font-medium text-[var(--foreground)]">{q.stem}</p>
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="neutral" variant="subtle">
                      {q.categoryLabel}
                    </Badge>
                    <span className="flex items-center gap-3 text-xs text-[var(--muted)] tabular-nums">
                      {q.accuracy.total} answered
                      <Badge tone={(q.accuracy.percent ?? 0) < 50 ? "negative" : "neutral"}>
                        {q.accuracy.percent != null ? `${q.accuracy.percent}%` : "—"}
                      </Badge>
                    </span>
                  </div>
                </Card>
              )}
            />
          )}
        </SectionPanel>

        <SectionPanel title="Hardest categories" aside="lowest accuracy">
          {hardestCategoryBars.length > 0 ? (
            <BarBreakdown
              data={hardestCategoryBars}
              ariaLabel="Accuracy by question category across all users"
              unit="%"
              max={100}
            />
          ) : (
            <p className="text-sm text-[var(--muted)]">No category data yet.</p>
          )}
        </SectionPanel>
      </div>

      {/* Content coverage: questions per category, image split, atlas split. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionPanel title="Questions by category" className="lg:col-span-2">
          <BarBreakdown
            data={questionsByCategoryBars}
            ariaLabel="Number of questions in each category"
          />
        </SectionPanel>

        <div className="flex flex-col gap-4">
          <StatTile
            label="Questions with an image"
            value={coverage.questionsWithImage.toLocaleString()}
            sub={`${coverage.questionsWithoutImage.toLocaleString()} without`}
          />
          <SectionPanel title="Atlas coverage">
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {coverage.atlasByCategory.map((c) => (
                <li
                  key={c.key}
                  className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0 text-sm"
                >
                  <span className="text-[var(--muted)]">{c.label}</span>
                  <span className="font-medium tabular-nums">{c.count}</span>
                </li>
              ))}
            </ul>
          </SectionPanel>
        </div>
      </div>

      {/* Activity: most / least active + zero-attempt headcount. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionPanel title="Most active users" className="lg:col-span-1">
          {activity.mostActive.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No activity yet.</p>
          ) : (
            <DataTable
              columns={activityColumns}
              rows={activity.mostActive}
              rowKey={(u) => u.id}
              minWidthClass="min-w-0"
              renderCard={(u) => (
                <div className="flex items-center justify-between gap-4 py-1">
                  <span className="min-w-0 truncate font-medium text-[var(--foreground)]">{u.name}</span>
                  <span className="shrink-0 tabular-nums text-[var(--muted)]">{u.attempts}</span>
                </div>
              )}
            />
          )}
        </SectionPanel>

        <SectionPanel title="Least active users" className="lg:col-span-1">
          {activity.leastActive.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No activity yet.</p>
          ) : (
            <DataTable
              columns={activityColumns}
              rows={activity.leastActive}
              rowKey={(u) => u.id}
              minWidthClass="min-w-0"
              renderCard={(u) => (
                <div className="flex items-center justify-between gap-4 py-1">
                  <span className="min-w-0 truncate font-medium text-[var(--foreground)]">{u.name}</span>
                  <span className="shrink-0 tabular-nums text-[var(--muted)]">{u.attempts}</span>
                </div>
              )}
            />
          )}
        </SectionPanel>

        <StatTile
          label="Users with no attempts"
          value={activity.usersWithZeroAttempts.toLocaleString()}
          sub={`of ${totals.users.toLocaleString()} total users`}
          className="lg:col-span-1"
        />
      </div>
    </div>
  );
}
