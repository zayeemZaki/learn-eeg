/**
 * Analytics — the single source of truth for every stat shown on the user
 * dashboard and the admin overview. Centralised so every screen agrees on what a
 * number means; pages never recompute accuracy inline.
 *
 * THE ACCURACY DEFINITION (used everywhere): a question's correctness is its
 * LATEST attempt, by createdAt. Because the retry model allows multiple Attempts
 * per (user, question) and there is no unique constraint, counting raw attempts
 * would let a user inflate "accuracy" by re-answering. So every accuracy figure
 * here first reduces a scope's attempts to the most recent attempt per
 * (user, question) and computes correct / total over those latest attempts only.
 *
 * groupBy cannot express "the latest row per group", so the pattern throughout is
 * the codebase's existing join-in-JS idiom: one findMany pulls the minimal
 * columns ({ userId?, questionId, isCorrect, createdAt }), and we reduce in JS
 * via a Map keyed by the question (user scope) or by userId+questionId (global).
 * One query per view — never per-row.
 *
 * BOUNDARY: every function here runs server-side and returns only computed
 * numbers / labels. Raw `isCorrect` rows and `passwordHash` never leave this
 * module — callers pass the returned summaries to client components as props.
 *
 * All "over time" series are bucketed in JS from createdAt (the DB has no
 * date_trunc helper exposed through Prisma without raw SQL), defaulting to day
 * granularity with a caller-chosen window.
 */
import { QuestionCategory } from "@prisma/client";

import { db } from "@/lib/db";
import { QUESTION_CATEGORY_LABELS } from "@/lib/validations/question";

// ── Shared types ──────────────────────────────────────────────────────────────

/** correct / total over LATEST-per-question attempts, plus the derived percent. */
export interface Accuracy {
  /** Distinct questions that have at least one attempt in scope. */
  total: number;
  /** Of those, how many have a CORRECT latest attempt. */
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

/** A question ranked by difficulty-in-practice (lowest latest-accuracy first). */
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
 * Reduce a list of attempts to the latest attempt per question, then tally
 * correct / total. The attempts must already be scoped (a single user, or all
 * users for a single question) so that the question id alone identifies a group.
 */
function accuracyFromLatestPerQuestion(
  attempts: { questionId: string; isCorrect: boolean; createdAt: Date }[],
): Accuracy {
  // questionId -> the latest attempt's correctness.
  const latest = new Map<string, { isCorrect: boolean; at: number }>();
  for (const a of attempts) {
    const at = a.createdAt.getTime();
    const prev = latest.get(a.questionId);
    if (!prev || at > prev.at) latest.set(a.questionId, { isCorrect: a.isCorrect, at });
  }
  let correct = 0;
  for (const v of latest.values()) if (v.isCorrect) correct += 1;
  const total = latest.size;
  return { total, correct, percent: toPercent(correct, total) };
}

/** Accuracy over a set of already-latest rows (one row per question, in scope). */
function accuracyOfLatestRows(rows: { isCorrect: boolean }[]): Accuracy {
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

/**
 * Bucket timestamps into a dense daily series spanning the last `days` days
 * (inclusive of today). Dense = every day present, zero-filled, so a line chart
 * has no gaps. `now` is passed in (request time) rather than read here, keeping
 * the function pure and testable. Counts only timestamps within the window.
 */
function bucketByDay(timestamps: Date[], days: number, now: Date): TimePoint[] {
  // Build the ordered day keys for the window [now-(days-1) .. now].
  const keys: string[] = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    keys.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const counts = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const t of timestamps) {
    const k = dayKey(t);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return keys.map((date) => ({ date, count: counts.get(date) ?? 0 }));
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
  /** Raw attempts logged (includes repeats) — "questions answered". */
  totalAttempts: number;
  /** Distinct questions the user has attempted at least once. */
  distinctQuestions: number;
  /** Latest-per-question accuracy across all the user's attempts. */
  accuracy: Accuracy;
  /** Most recent attempt time, or null if none — drives "last active". */
  lastActiveAt: Date | null;
  /** Daily activity (attempt counts) over the trailing window. */
  activity: TimePoint[];
  /** Attempts in the trailing window vs the equal window before it (a count). */
  attemptsTrend: Trend;
  /**
   * Accuracy over the trailing window vs the one before, in percentage points.
   * This is WINDOWED accuracy (every attempt in the period), not the headline
   * latest-per-question figure — a period comparison has to score each period on
   * what happened inside it.
   */
  accuracyTrend: Trend;
  /** Latest-accuracy per difficulty level (1–3), only levels with attempts. */
  byDifficulty: AccuracyBreakdownItem[];
  /** Latest-accuracy per question category, only categories with attempts. */
  byCategory: AccuracyBreakdownItem[];
  /** Weakest categories (lowest latest-accuracy first) — the focus areas. */
  weakCategories: AccuracyBreakdownItem[];
}

const DIFFICULTY_LABELS: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

/**
 * Build the full user dashboard summary, scoped to ONE user. A single attempts
 * findMany (filtered to this user, joined to each question's difficulty +
 * category) feeds every figure; everything else is in-memory reduction. Returns
 * only numbers/labels — no isCorrect rows escape.
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
  const attempts = await db.attempt.findMany({
    where: { userId },
    select: {
      questionId: true,
      isCorrect: true,
      createdAt: true,
      question: { select: { difficulty: true, category: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalAttempts = attempts.length;
  const distinctQuestions = new Set(attempts.map((a) => a.questionId)).size;
  // Newest attempt time, derived from the data (not by trusting the query sort).
  const lastActiveAt = attempts.reduce<Date | null>(
    (newest, a) => (newest === null || a.createdAt > newest ? a.createdAt : newest),
    null,
  );

  // Overall latest-per-question accuracy.
  const accuracy = accuracyFromLatestPerQuestion(attempts);

  // Per-difficulty + per-category: reduce latest-per-question once, then group.
  // We first collapse to one latest attempt per question (carrying its
  // difficulty + category), then tally each grouping over those latest rows.
  const latestPerQuestion = new Map<
    string,
    { isCorrect: boolean; at: number; difficulty: number; category: QuestionCategory }
  >();
  for (const a of attempts) {
    const at = a.createdAt.getTime();
    const prev = latestPerQuestion.get(a.questionId);
    if (!prev || at > prev.at) {
      latestPerQuestion.set(a.questionId, {
        isCorrect: a.isCorrect,
        at,
        difficulty: a.question.difficulty,
        category: a.question.category,
      });
    }
  }
  const latestRows = [...latestPerQuestion.values()];

  const byDifficulty = groupAccuracy(
    latestRows,
    (r) => String(r.difficulty),
    (r) => DIFFICULTY_LABELS[r.difficulty] ?? `Level ${r.difficulty}`,
  ).sort((a, b) => Number(a.key) - Number(b.key));

  const byCategory = groupAccuracy(
    latestRows,
    (r) => r.category,
    (r) => QUESTION_CATEGORY_LABELS[r.category],
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
    totalAttempts,
    distinctQuestions,
    accuracy,
    attemptsTrend,
    accuracyTrend,
    lastActiveAt,
    activity,
    byDifficulty,
    byCategory,
    weakCategories,
  };
}

/**
 * Group already-latest rows by a key, tally accuracy per group, and label each.
 * Shared by the per-difficulty and per-category breakdowns.
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
    accuracy: accuracyOfLatestRows(g.rows),
  }));
}

// ── ADMIN analytics ───────────────────────────────────────────────────────────

/** Top-line content + activity counts for the admin overview. */
export interface AdminTotals {
  users: number;
  questions: number;
  atlasEntries: number;
  attempts: number;
  /** Accuracy across the WHOLE platform (single-attempt model: one Attempt per user/question). */
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
 * Platform totals plus the ONE global accuracy figure. With the single-attempt
 * model there is at most one Attempt per (user, question), so "latest per pair"
 * is just every row — accuracy is a plain correct/total count, both DB
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
 * Signups-over-time and attempts-over-time as dense daily series. Two findMany
 * pulls of just createdAt, bucketed in JS over the trailing `days` window.
 */
export async function getAdminTrends(now: Date, days = 30): Promise<AdminTrends> {
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  since.setDate(since.getDate() - (days - 1));

  const [userRows, attemptRows] = await Promise.all([
    db.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.attempt.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  return {
    signups: bucketByDay(userRows.map((u) => u.createdAt), days, now),
    attempts: bucketByDay(attemptRows.map((a) => a.createdAt), days, now),
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
  const { AtlasCategory } = await import("@prisma/client");
  const { ATLAS_CATEGORY_LABELS } = await import("@/lib/validations/atlas");

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
