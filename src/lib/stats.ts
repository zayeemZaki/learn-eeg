/**
 * Analytics — the single source of truth for every stat shown on the user
 * dashboard and the admin overview. Centralised so every screen agrees on what a
 * number means; pages never recompute accuracy inline.
 *
 * THE ACCURACY DEFINITION (used everywhere): correct / total over a scope's
 * attempts. This is exact and needs no de-duplication because the SINGLE-ATTEMPT
 * model is enforced by the database: Attempt carries
 * `@@unique([userId, questionId])` (migration 20260706165747), so a user has at
 * most ONE attempt per question and there is no "retry" to collapse. An attempt
 * row and an answered question are the same thing.
 *
 * (Historically this module reduced each scope to its latest attempt per question
 * to stop users inflating accuracy by re-answering. The unique constraint made
 * that reduction dead weight — one row per question is now a database invariant,
 * not something to recompute in JS. If a retry model is ever reintroduced, that
 * constraint is what has to change first, and this doc with it.)
 *
 * BOUNDARY: every function here runs server-side and returns only computed
 * numbers / labels. Raw `isCorrect` rows and `passwordHash` never leave this
 * module — callers pass the returned summaries to client components as props.
 *
 * All "over time" series are bucketed in JS from createdAt (the DB has no
 * date_trunc helper exposed through Prisma without raw SQL), defaulting to day
 * granularity with a caller-chosen window.
 */
import { AtlasCategory, QuestionCategory } from "@prisma/client";

import { db } from "@/lib/db";
import { ATLAS_CATEGORY_LABELS } from "@/lib/validations/atlas";
import { QUESTION_CATEGORY_LABELS } from "@/lib/validations/question";

// ── Shared types ──────────────────────────────────────────────────────────────

/** correct / total over the attempts in scope, plus the derived percent. */
export interface Accuracy {
  /** Questions answered in scope (one attempt per question — see the header). */
  total: number;
  /** Of those, how many were answered correctly. */
  correct: number;
  /** Rounded 0–100, or null when total === 0 (no attempts → "—", not "0%"). */
  percent: number | null;
}

/** A labelled accuracy slice — per category or per difficulty. */
export interface AccuracyBreakdownItem {
  key: string;
  label: string;
  accuracy: Accuracy;
}

/** One point in a daily time series. `date` is an ISO yyyy-mm-dd day key. */
export interface TimePoint {
  date: string;
  count: number;
}

/**
 * A period-over-period comparison: the current trailing window against the equal
 * window before it. `delta` is in the metric's own unit — a count for attempts,
 * PERCENTAGE POINTS for accuracy (83%→87% is +4 points, not +4.8%).
 */
export interface Trend {
  current: number;
  previous: number;
  /** current - previous, or null when the prior window has no data to compare against. */
  delta: number | null;
}

/** A question ranked by difficulty-in-practice (lowest accuracy first). */
export interface HardestQuestion {
  id: string;
  stem: string;
  category: QuestionCategory;
  categoryLabel: string;
  accuracy: Accuracy;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Round to a 0–100 percent, or null when there's nothing to measure. */
function toPercent(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

const EMPTY_ACCURACY: Accuracy = { total: 0, correct: 0, percent: null };

/**
 * Tally correct / total over a set of attempt rows. One row per (user, question)
 * is a database invariant (see the header), so this is a plain count — no
 * de-duplication step.
 */
function accuracyOf(rows: { isCorrect: boolean }[]): Accuracy {
  const total = rows.length;
  const correct = rows.reduce((n, r) => (r.isCorrect ? n + 1 : n), 0);
  return { total, correct, percent: toPercent(correct, total) };
}

/** Local yyyy-mm-dd day key for a timestamp (server-local; matches request tz). */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The ordered day keys covering the window [now-(days-1) … now], inclusive. */
function dayKeysForWindow(days: number, now: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    keys.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

/**
 * Bucket timestamps into a dense daily series spanning the last `days` days
 * (inclusive of today). Dense = every day present, zero-filled, so a line chart
 * has no gaps. `now` is passed in (request time) rather than read here, keeping
 * the function pure and testable. Counts only timestamps within the window.
 */
function bucketByDay(timestamps: Date[], days: number, now: Date): TimePoint[] {
  const keys = dayKeysForWindow(days, now);
  const counts = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const t of timestamps) {
    const k = dayKey(t);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return keys.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

/**
 * Consecutive active days ending today or yesterday. A day counts when it has at
 * least one attempt; if neither of those two most recent days is active, the
 * streak is zero. The dense activity series supplies every needed day already.
 */
function practiceStreak(activity: TimePoint[]): number {
  const today = activity.length - 1;
  const end = activity[today]?.count ? today : activity[today - 1]?.count ? today - 1 : -1;
  if (end < 0) return 0;

  let streak = 0;
  for (let index = end; index >= 0 && activity[index]!.count > 0; index -= 1) streak += 1;
  return streak;
}

/**
 * One day-group from the trend queries: the day as an ALREADY-FORMATTED yyyy-mm-dd
 * string, and how many rows fell in it.
 *
 * The day deliberately crosses the boundary as text, not as a Date. Postgres
 * `... AT TIME ZONE '<zone>'` yields a zone-less `timestamp`, and the driver then
 * reinterprets that naive value against the process offset — so reading it back as
 * a Date shifts buckets by a day in either direction depending on which getters are
 * used. Formatting in SQL (`to_char`) makes the key unambiguous: what the database
 * grouped by is exactly what we compare against.
 */
interface DailyCountRow {
  day: string;
  count: number;
}

/**
 * Zero-fill DB-side daily counts into the same dense series bucketByDay produces,
 * so a chart fed from grouped SQL is indistinguishable from one fed from rows.
 * Counts outside the window are ignored, exactly as bucketByDay ignores them.
 *
 * The rows already carry a yyyy-mm-dd string in the same zone dayKeysForWindow
 * uses, so matching is a direct lookup — see DailyCountRow for why the key is text.
 */
function denseSeriesFromDailyCounts(
  rows: DailyCountRow[],
  days: number,
  now: Date,
): TimePoint[] {
  const counts = new Map(rows.map((r) => [r.day, Number(r.count)]));
  return dayKeysForWindow(days, now).map((date) => ({
    date,
    count: counts.get(date) ?? 0,
  }));
}

/**
 * The two boundaries (epoch ms) splitting the trailing `days` window from the
 * equal-length one before it: [prevStart … cutoff … now].
 */
function windowBounds(now: Date, days: number): { prevStart: number; cutoff: number } {
  const span = days * 24 * 60 * 60 * 1000;
  const cutoff = now.getTime() - span;
  return { prevStart: cutoff - span, cutoff };
}

// ── USER dashboard ────────────────────────────────────────────────────────────

/** Everything the user dashboard renders, for one signed-in user. */
export interface UserSummary {
  /**
   * Questions this user has answered. One attempt per question is a database
   * invariant (see the module header), so this is both the attempt count and the
   * distinct-question count — there is no separate "distinct" figure to report.
   */
  questionsAnswered: number;
  /**
   * Size of the whole question bank, so the dashboard can frame progress as
   * "answered N of M" instead of a bare count with nothing to compare against.
   */
  totalQuestions: number;
  /** Accuracy across everything the user has answered. */
  accuracy: Accuracy;
  /** Most recent attempt time, or null if none — drives "last active". */
  lastActiveAt: Date | null;
  /** Daily activity (attempt counts) over the trailing window. */
  activity: TimePoint[];
  /** Consecutive active days ending today or yesterday. */
  practiceStreak: number;
  /** Attempts in the trailing window vs the equal window before it (a count). */
  attemptsTrend: Trend;
  /**
   * Accuracy over the trailing window vs the one before, in percentage points.
   * Scoped to what was answered INSIDE each period — a period comparison has to
   * score each period on its own activity, so this differs from the headline
   * all-time `accuracy` above.
   */
  accuracyTrend: Trend;
  /** Accuracy per difficulty level (1–3), only levels with attempts. */
  byDifficulty: AccuracyBreakdownItem[];
  /** Accuracy per question category, only categories with attempts. */
  byCategory: AccuracyBreakdownItem[];
  /** Weakest categories (lowest accuracy first) — the focus areas. */
  weakCategories: AccuracyBreakdownItem[];
}

const DIFFICULTY_LABELS: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

/**
 * Ceiling on attempt rows read to build one user's dashboard. Bounded by the
 * question bank in practice (one attempt per question); present so this render path
 * has a hard limit regardless of how the data grows.
 */
const MAX_USER_ATTEMPTS_SCANNED = 5000;

/**
 * Build the full user dashboard summary, scoped to ONE user. One attempts
 * findMany (filtered to this user, joined to each question's difficulty +
 * category) plus one bank-size count feed every figure; everything else is
 * in-memory reduction. Returns only numbers/labels — no isCorrect rows escape.
 *
 * BOUNDEDNESS: the attempts read is capped at MAX_USER_ATTEMPTS_SCANNED. One
 * attempt per question means this cannot exceed the size of the question bank, so
 * the cap is a backstop rather than a truncation anyone should hit — but it keeps a
 * page render from ever depending on an unbounded row count.
 *
 * @param userId  the signed-in user; the ONLY user whose data is read.
 * @param now     request time, for the trailing activity window.
 * @param activityDays  size of the activity window in days (default 30).
 */
export async function getUserSummary(
  userId: string,
  now: Date,
  activityDays = 30,
): Promise<UserSummary> {
  const [attempts, totalQuestions] = await Promise.all([
    db.attempt.findMany({
      where: { userId },
      select: {
        questionId: true,
        isCorrect: true,
        createdAt: true,
        question: { select: { difficulty: true, category: true } },
      },
      orderBy: { createdAt: "asc" },
      take: MAX_USER_ATTEMPTS_SCANNED,
    }),
    db.question.count(),
  ]);

  const questionsAnswered = attempts.length;
  // Newest attempt time, derived from the data (not by trusting the query sort).
  const lastActiveAt = attempts.reduce<Date | null>(
    (newest, a) => (newest === null || a.createdAt > newest ? a.createdAt : newest),
    null,
  );

  const accuracy = accuracyOf(attempts);

  // One row per question already (see the module header), so the breakdowns group
  // the attempt rows directly — no collapse step.
  const byDifficulty = groupAccuracy(
    attempts,
    (a) => String(a.question.difficulty),
    (a) =>
      DIFFICULTY_LABELS[a.question.difficulty] ?? `Level ${a.question.difficulty}`,
  ).sort((a, b) => Number(a.key) - Number(b.key));

  const byCategory = groupAccuracy(
    attempts,
    (a) => a.question.category,
    (a) => QUESTION_CATEGORY_LABELS[a.question.category],
  );

  // Weakest categories: those with attempts, lowest accuracy first; ties broken
  // by volume (more answered = more confident it's a real weak spot).
  const weakCategories = [...byCategory]
    .sort((a, b) => {
      const pa = a.accuracy.percent ?? 0;
      const pb = b.accuracy.percent ?? 0;
      if (pa !== pb) return pa - pb;
      return b.accuracy.total - a.accuracy.total;
    });

  const activity = bucketByDay(
    attempts.map((a) => a.createdAt),
    activityDays,
    now,
  );
  const streak = practiceStreak(activity);

  // Both windows are partitioned out of the `attempts` rows already in memory, so
  // the trends add no query.
  const { prevStart, cutoff } = windowBounds(now, activityDays);
  const currentWindow: typeof attempts = [];
  const previousWindow: typeof attempts = [];
  for (const a of attempts) {
    const at = a.createdAt.getTime();
    if (at >= cutoff) currentWindow.push(a);
    else if (at >= prevStart) previousWindow.push(a);
  }

  const attemptsTrend: Trend = {
    current: currentWindow.length,
    previous: previousWindow.length,
    // An empty prior window means the user is new to the metric; "+12 vs zero" is
    // noise, so withhold the delta rather than invent one.
    delta: previousWindow.length > 0 ? currentWindow.length - previousWindow.length : null,
  };

  const currentPct = toPercent(
    currentWindow.reduce((n, a) => (a.isCorrect ? n + 1 : n), 0),
    currentWindow.length,
  );
  const previousPct = toPercent(
    previousWindow.reduce((n, a) => (a.isCorrect ? n + 1 : n), 0),
    previousWindow.length,
  );
  const accuracyTrend: Trend = {
    current: currentPct ?? 0,
    previous: previousPct ?? 0,
    delta: currentPct != null && previousPct != null ? currentPct - previousPct : null,
  };

  return {
    questionsAnswered,
    totalQuestions,
    accuracy,
    attemptsTrend,
    accuracyTrend,
    lastActiveAt,
    activity,
    practiceStreak: streak,
    byDifficulty,
    byCategory,
    weakCategories,
  };
}

/**
 * Group attempt rows by a key, tally accuracy per group, and label each. Shared
 * by the per-difficulty and per-category breakdowns.
 */
function groupAccuracy<T extends { isCorrect: boolean }>(
  rows: T[],
  keyOf: (row: T) => string,
  labelOf: (row: T) => string,
): AccuracyBreakdownItem[] {
  const groups = new Map<string, { label: string; rows: { isCorrect: boolean }[] }>();
  for (const r of rows) {
    const key = keyOf(r);
    const g = groups.get(key) ?? { label: labelOf(r), rows: [] };
    g.rows.push({ isCorrect: r.isCorrect });
    groups.set(key, g);
  }
  return [...groups.entries()].map(([key, g]) => ({
    key,
    label: g.label,
    accuracy: accuracyOf(g.rows),
  }));
}

// ── ADMIN analytics ───────────────────────────────────────────────────────────

/** Top-line content + activity counts for the admin overview. */
export interface AdminTotals {
  users: number;
  questions: number;
  atlasEntries: number;
  attempts: number;
  /** Accuracy across the WHOLE platform (one Attempt per user/question). */
  accuracy: Accuracy;
}

/** Content coverage — how the question bank and atlas are populated. */
export interface CoverageStats {
  /** Questions per category (all categories, zero-filled), for a bar chart. */
  questionsByCategory: { key: string; label: string; count: number }[];
  questionsWithImage: number;
  questionsWithoutImage: number;
  /** Atlas entries per atlas category. */
  atlasByCategory: { key: string; label: string; count: number }[];
}

/** A user row for the activity tables (most/least active). */
export interface UserActivityRow {
  id: string;
  name: string;
  attempts: number;
}

/** The admin activity block: leaderboards + the zero-attempt headcount. */
export interface AdminActivity {
  mostActive: UserActivityRow[];
  leastActive: UserActivityRow[];
  usersWithZeroAttempts: number;
}

// ── Admin: totals + global accuracy ───────────────────────────────────────────

/**
 * Platform totals plus the ONE global accuracy figure. One Attempt per
 * (user, question) means accuracy is a plain correct/total count, both DB
 * aggregates. No rows are pulled into JS.
 */
export async function getAdminTotals(): Promise<AdminTotals> {
  const [users, questions, atlasEntries, attempts, correct] = await Promise.all([
    db.user.count(),
    db.question.count(),
    db.atlasEntry.count(),
    db.attempt.count(),
    db.attempt.count({ where: { isCorrect: true } }),
  ]);

  const accuracy = { total: attempts, correct, percent: toPercent(correct, attempts) };

  return { users, questions, atlasEntries, attempts, accuracy };
}

// ── Admin: trends over time ───────────────────────────────────────────────────

/** Daily signups and daily attempts over a trailing window, for line charts. */
export interface AdminTrends {
  signups: TimePoint[];
  attempts: TimePoint[];
}

/**
 * Signups-over-time and attempts-over-time as dense daily series.
 *
 * The counting is done by the DATABASE (`date_trunc` + `group_by`), not by pulling
 * every row in the window into JS to be tallied. The previous shape read one row
 * per signup and one per attempt on every admin page load, so the cost of drawing a
 * 30-day chart grew with total platform activity; grouped, it is proportional to
 * the number of DAYS instead — at most `days` rows back, whatever the volume.
 *
 * This is the one place raw SQL is warranted: Prisma's groupBy cannot express a
 * date_trunc key. Both queries are parameterised (no interpolation), and the window
 * boundary is computed here rather than in SQL so it matches the JS bucketing
 * exactly.
 *
 * TIME ZONE — the subtle part. Prisma maps DateTime to `timestamp WITHOUT time
 * zone` and writes UTC wall-clock values into it, so the column holds UTC instants
 * with no zone attached. Every other date in this module (dayKey, the activity
 * window, the "last active" label) is computed in the SERVER's local zone, so
 * grouping by the raw column would file a late-evening local attempt under the next
 * day and shift the chart against the rest of the dashboard.
 *
 * Converting therefore takes TWO steps: `AT TIME ZONE 'UTC'` first, to tag the naive
 * value as the UTC instant it actually is, and only then `AT TIME ZONE <server zone>`
 * to land in local time. Applying the second step alone would ADD the offset instead
 * of subtracting it — Postgres reads a naive input as already being in the target
 * zone — which is exactly the off-by-one-day bug this shape avoids. The zone is read
 * from the runtime and passed as a bound parameter, so SQL and JS cannot drift.
 */
export async function getAdminTrends(now: Date, days = 30): Promise<AdminTrends> {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  since.setDate(since.getDate() - (days - 1));

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [signupRows, attemptRows] = await Promise.all([
    db.$queryRaw<DailyCountRow[]>`
      SELECT to_char(
               (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}),
               'YYYY-MM-DD'
             ) AS day,
             COUNT(*)::int AS count
      FROM "User"
      WHERE "createdAt" >= ${since}
      GROUP BY day
    `,
    db.$queryRaw<DailyCountRow[]>`
      SELECT to_char(
               (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}),
               'YYYY-MM-DD'
             ) AS day,
             COUNT(*)::int AS count
      FROM "Attempt"
      WHERE "createdAt" >= ${since}
      GROUP BY day
    `,
  ]);

  return {
    signups: denseSeriesFromDailyCounts(signupRows, days, now),
    attempts: denseSeriesFromDailyCounts(attemptRows, days, now),
  };
}

// ── Admin: hardest questions + categories ─────────────────────────────────────

/**
 * Hardest questions across ALL users — lowest accuracy first, requiring a
 * minimum number of answerers so a single wrong answer doesn't top the list.
 * `category` lives on Question, not Attempt, so it can't be a groupBy key
 * directly; instead we groupBy Attempt on questionId (two DB-level aggregates,
 * bounded by distinct QUESTIONS answered, not total attempts) and join each
 * question's stem + category from one bounded findMany scoped to just those
 * question ids. No full Attempt table is ever pulled into JS.
 *
 * @param minAnswerers  a question needs at least this many answerers to be
 *                      eligible (default 1).
 * @param limit         how many hardest questions to return (default 10).
 */
export async function getHardestContent(
  minAnswerers = 1,
  limit = 10,
): Promise<{ questions: HardestQuestion[]; categories: AccuracyBreakdownItem[] }> {
  const [totalsByQuestion, correctByQuestion] = await Promise.all([
    db.attempt.groupBy({ by: ["questionId"], _count: { _all: true } }),
    db.attempt.groupBy({
      by: ["questionId"],
      where: { isCorrect: true },
      _count: { _all: true },
    }),
  ]);

  const correctCounts = new Map(correctByQuestion.map((g) => [g.questionId, g._count._all]));
  const perQuestion = totalsByQuestion.map((g) => {
    const total = g._count._all;
    const correct = correctCounts.get(g.questionId) ?? 0;
    return { questionId: g.questionId, total, correct, percent: toPercent(correct, total) };
  });

  // Join stem + category for every question that has at least one attempt —
  // bounded by distinct answered questions, never by attempt volume.
  const questionRows = await db.question.findMany({
    where: { id: { in: perQuestion.map((g) => g.questionId) } },
    select: { id: true, stem: true, category: true },
  });
  const questionById = new Map(questionRows.map((q) => [q.id, q]));

  const questions: HardestQuestion[] = perQuestion
    .filter((g) => g.total >= minAnswerers)
    .sort((a, b) => {
      const pa = a.percent ?? 0;
      const pb = b.percent ?? 0;
      if (pa !== pb) return pa - pb; // hardest (lowest accuracy) first
      return b.total - a.total; // then most-answered
    })
    .slice(0, limit)
    .map((g) => {
      const q = questionById.get(g.questionId);
      return q
        ? {
            id: g.questionId,
            stem: q.stem,
            category: q.category,
            categoryLabel: QUESTION_CATEGORY_LABELS[q.category],
            accuracy: { total: g.total, correct: g.correct, percent: g.percent },
          }
        : null;
    })
    .filter((q): q is HardestQuestion => q !== null);

  // Hardest categories: fold every answered question's correct/total into its
  // category bucket. Still bounded by distinct questions, not attempt volume.
  const byCategory = new Map<QuestionCategory, { correct: number; total: number }>();
  for (const g of perQuestion) {
    const q = questionById.get(g.questionId);
    if (!q) continue;
    const bucket = byCategory.get(q.category) ?? { correct: 0, total: 0 };
    bucket.correct += g.correct;
    bucket.total += g.total;
    byCategory.set(q.category, bucket);
  }
  const categories: AccuracyBreakdownItem[] = [...byCategory.entries()]
    .map(([key, { correct, total }]) => ({
      key,
      label: QUESTION_CATEGORY_LABELS[key],
      accuracy: { total, correct, percent: toPercent(correct, total) },
    }))
    .sort((a, b) => (a.accuracy.percent ?? 0) - (b.accuracy.percent ?? 0));

  return { questions, categories };
}

// ── Admin: content coverage ───────────────────────────────────────────────────

/**
 * Content coverage: questions per category (dense over all categories), the
 * with/without-image split, and atlas entries per category. Three grouped
 * aggregates + one count — no rows pulled into JS.
 */
export async function getCoverage(): Promise<CoverageStats> {
  const [qByCat, withImage, totalQuestions, atlasByCat] = await Promise.all([
    db.question.groupBy({ by: ["category"], _count: { _all: true } }),
    db.question.count({ where: { imageUrl: { not: null } } }),
    db.question.count(),
    db.atlasEntry.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);

  const qCounts = new Map(qByCat.map((g) => [g.category, g._count._all]));
  const questionsByCategory = Object.values(QuestionCategory).map((value) => ({
    key: value,
    label: QUESTION_CATEGORY_LABELS[value],
    count: qCounts.get(value) ?? 0,
  }));

  const atlasCounts = new Map(atlasByCat.map((g) => [g.category, g._count._all]));
  const atlasByCategory = Object.values(AtlasCategory).map((value) => ({
    key: value,
    label: ATLAS_CATEGORY_LABELS[value],
    count: atlasCounts.get(value) ?? 0,
  }));

  return {
    questionsByCategory,
    questionsWithImage: withImage,
    questionsWithoutImage: totalQuestions - withImage,
    atlasByCategory,
  };
}

// ── Admin: user activity ──────────────────────────────────────────────────────

/**
 * Activity leaderboards. One groupBy gives attempts-per-user; we join names for
 * just the top/bottom slices (never the whole table) and derive the zero-attempt
 * headcount as totalUsers − usersWithAnyAttempt. Names are fetched with an
 * explicit select that excludes passwordHash.
 *
 * @param limit  rows per leaderboard (default 5).
 */
export async function getAdminActivity(limit = 5): Promise<AdminActivity> {
  const [groups, totalUsers] = await Promise.all([
    db.attempt.groupBy({ by: ["userId"], _count: { _all: true } }),
    db.user.count(),
  ]);

  const ranked = groups
    .map((g) => ({ userId: g.userId, attempts: g._count._all }))
    .sort((a, b) => b.attempts - a.attempts);

  const usersWithZeroAttempts = totalUsers - ranked.length;

  const topIds = ranked.slice(0, limit).map((r) => r.userId);
  // Least active among users who HAVE attempted (zero-attempt users are counted
  // separately above). Exclude anyone already shown as most-active so the two
  // leaderboards stay disjoint — otherwise, with fewer than 2*limit attempters,
  // the tail slice would mirror the head and the same users would appear twice.
  const topSet = new Set(topIds);
  const bottomIds = ranked
    .filter((r) => !topSet.has(r.userId))
    .slice(-limit)
    .reverse()
    .map((r) => r.userId);

  const needed = [...new Set([...topIds, ...bottomIds])];
  const names = needed.length
    ? await db.user.findMany({
        where: { id: { in: needed } },
        select: { id: true, name: true }, // never passwordHash
      })
    : [];
  const nameById = new Map(names.map((u) => [u.id, u.name]));

  const attemptsById = new Map(ranked.map((r) => [r.userId, r.attempts]));
  const rowFor = (id: string): UserActivityRow => ({
    id,
    name: nameById.get(id) ?? "Unknown",
    attempts: attemptsById.get(id) ?? 0,
  });

  return {
    mostActive: topIds.map(rowFor),
    leastActive: bottomIds.map(rowFor),
    usersWithZeroAttempts,
  };
}
