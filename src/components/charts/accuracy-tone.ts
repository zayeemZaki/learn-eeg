/**
 * The single source of truth for what an accuracy percentage MEANS, so the
 * radial gauge, the breakdown bars, and the focus-area badges can never disagree
 * about where "good" starts.
 */

/** At or above this, a category reads as mastered. Mirrors the dashboard's WEAK_THRESHOLD. */
export const STRONG_THRESHOLD = 80;
/** Below this, a category reads as a genuine weak spot. */
export const WEAK_THRESHOLD = 60;

/**
 * The CSS variable for a given accuracy percent — a `var(--…)` string, so it
 * works in both Recharts' `fill` prop and a style attribute and stays themeable.
 * `null` (no data) falls back to --border: an absent measurement is a neutral
 * track, never a failing one.
 */
export function accuracyFill(percent: number | null): string {
  if (percent == null) return "var(--border)";
  if (percent >= STRONG_THRESHOLD) return "var(--success)";
  if (percent >= WEAK_THRESHOLD) return "var(--warning)";
  return "var(--danger)";
}
