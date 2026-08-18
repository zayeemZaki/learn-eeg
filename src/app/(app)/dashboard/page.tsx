import Link from "next/link";

import { auth } from "@/auth";
import { getUserSummary } from "@/lib/stats";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { SectionPanel } from "@/components/ui/section-panel";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { LineTrend } from "@/components/charts/line-trend";
import { BarBreakdown } from "@/components/charts/bar-breakdown";
import { RadialAccuracy } from "@/components/charts/radial-accuracy";
import { POSITION_LABELS } from "@/lib/validations/auth";
import { QuestionsIcon } from "@/components/shell/nav-icons";

export const metadata = { title: "Dashboard" };

const ACTIVITY_DAYS = 30;
// Categories below this accuracy are surfaced as focus areas; a category with
// no clear weakness shouldn't be nagged about.
const WEAK_THRESHOLD = 80;

const relTimeFmt = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "today" / "3 days ago" from a past date, server-rendered at request time. */
function lastActiveLabel(at: Date, now: Date): string {
  const days = Math.floor((now.getTime() - at.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  return relTimeFmt.format(-days, "day");
}

/**
 * The user dashboard — the signed-in user's own practice analytics. EVERY figure
 * comes from getUserSummary(userId), which is scoped to this user alone (no
 * cross-user data) and routes all accuracy through the shared latest-per-question
 * definition. Only computed numbers reach the client; no raw isCorrect rows.
 *
 * With zero attempts we show a guiding EmptyState rather than empty charts.
 */
export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const now = new Date();

  const summary = await getUserSummary(userId, now, ACTIVITY_DAYS);
  const { accuracy } = summary;
  const hasAttempts = summary.questionsAnswered > 0;

  // Difficulty / category breakdowns as percentage bars (only groups attempted).
  const difficultyBars = summary.byDifficulty.map((d) => ({
    label: d.label,
    value: d.accuracy.percent ?? 0,
    hint: `${d.accuracy.correct} of ${d.accuracy.total} correct`,
  }));
  const categoryBars = summary.byCategory.map((c) => ({
    label: c.label,
    value: c.accuracy.percent ?? 0,
    hint: `${c.accuracy.correct} of ${c.accuracy.total} correct`,
  }));

  // Focus areas: weakest attempted categories under the threshold.
  const focusAreas = summary.weakCategories
    .filter((c) => c.accuracy.percent != null && c.accuracy.percent < WEAK_THRESHOLD)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Welcome, ${session!.user.name}`}
        description={`${POSITION_LABELS[session!.user.position]} · ${session!.user.institution}`}
      />

      {!hasAttempts ? (
        <EmptyState
          icon={<QuestionsIcon />}
          message="You haven't answered any questions yet."
          hint="Work through a few teaching cases and your progress, accuracy, and focus areas will appear here."
          action={{ href: "/questions", label: "Start practising" }}
        />
      ) : (
        <>
          {/* Top-line stats. One attempt per question, so "answered" and
              "distinct" are the same number — reporting it once. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
              label="Questions answered"
              value={summary.questionsAnswered.toLocaleString()}
              delta={{
                value: summary.attemptsTrend.delta,
                label: `vs previous ${ACTIVITY_DAYS} days`,
              }}
              sub={`of ${summary.totalQuestions.toLocaleString()} in the question bank`}
            />
            <StatTile
              label="Accuracy"
              value={accuracy.percent != null ? `${accuracy.percent}%` : "—"}
              // Percentage POINTS, not percent: 83%→87% is "+4 pts", not "+4%".
              delta={{
                value: summary.accuracyTrend.delta,
                unit: " pts",
                label: `vs previous ${ACTIVITY_DAYS} days`,
              }}
              sub={`${accuracy.correct} of ${accuracy.total} correct`}
            />
            <StatTile
              label="Last active"
              value={summary.lastActiveAt ? lastActiveLabel(summary.lastActiveAt, now) : "—"}
              sub={`${ACTIVITY_DAYS}-day activity below`}
            />
          </div>

          {/* Accuracy gauge + activity trend, side by side on wide screens. */}
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionPanel title="Current accuracy" className="lg:col-span-1">
              <RadialAccuracy percent={accuracy.percent} ariaLabel="Your accuracy" />
              <p className="mt-2 text-center text-sm text-[var(--muted)]">
                Based on the {accuracy.total}{" "}
                {accuracy.total === 1 ? "question" : "questions"} you have answered.
              </p>
            </SectionPanel>

            <SectionPanel title={`Activity · last ${ACTIVITY_DAYS} days`} className="lg:col-span-2">
              <LineTrend data={summary.activity} ariaLabel="Your daily attempts over the last 30 days" />
            </SectionPanel>
          </div>

          {/* Breakdowns: accuracy by category and by difficulty. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionPanel title="Accuracy by category">
              {categoryBars.length > 0 ? (
                <BarBreakdown
                  data={categoryBars}
                  ariaLabel="Accuracy by question category"
                  unit="%"
                  max={100}
                  semantic
                />
              ) : (
                <p className="text-sm text-[var(--muted)]">No category data yet.</p>
              )}
            </SectionPanel>

            <SectionPanel title="Accuracy by difficulty">
              {difficultyBars.length > 0 ? (
                <BarBreakdown
                  data={difficultyBars}
                  ariaLabel="Accuracy by question difficulty"
                  unit="%"
                  max={100}
                  semantic
                />
              ) : (
                <p className="text-sm text-[var(--muted)]">No difficulty data yet.</p>
              )}
            </SectionPanel>
          </div>

          {/* Focus areas: the weakest categories, with a route into practice. */}
          <SectionPanel
            title="Focus areas"
            aside={
              <Link
                href="/questions?status=unanswered"
                className="text-sm font-medium text-[var(--accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
              >
                Practise more
              </Link>
            }
          >
            {focusAreas.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No weak spots yet — you&apos;re at or above {WEAK_THRESHOLD}% in every category
                you&apos;ve practised. Keep going.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--border)]">
                {focusAreas.map((area) => (
                  <li
                    key={area.key}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--foreground)]">{area.label}</p>
                      <p className="text-sm text-[var(--muted)] tabular-nums">
                        {area.accuracy.correct} of {area.accuracy.total} correct
                      </p>
                    </div>
                    <Badge tone="negative">{area.accuracy.percent}%</Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>

          {/* Wayfinding back into the bank. */}
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-[var(--foreground)]">Keep practising</p>
              <p className="text-sm text-[var(--muted)]">
                Work through more teaching cases to sharpen your weak areas.
              </p>
            </div>
            <Link href="/questions" className={buttonClass()}>
              Go to question bank
            </Link>
          </Card>
        </>
      )}
    </div>
  );
}
