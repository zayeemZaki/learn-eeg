/**
 * The navigation glyphs for the shell sidebar — one per primary/admin item.
 * Presentational only (currentColor stroke so they inherit the active/idle nav
 * colour, aria-hidden because the adjacent label names the destination). Sized
 * to the nav row by a fixed inline class; the rail and the expanded sidebar use
 * the same icon.
 */
const cls = "h-[18px] w-[18px] shrink-0";

export function DashboardIcon() {
  return (
    <svg viewBox="0 0 20 20" className={cls} fill="none" aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Question bank — a stack of cards / a list of cases. */
export function QuestionsIcon() {
  return (
    <svg viewBox="0 0 20 20" className={cls} fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 8h7M6.5 11.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Atlas — an EEG trace, the product motif. */
export function AtlasIcon() {
  return (
    <svg viewBox="0 0 20 20" className={cls} fill="none" aria-hidden="true">
      <path
        d="M2 10h2l1.5-4 2 8 2-10 1.5 6 1.5-3H18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Literature — an open document. */
export function LiteratureIcon() {
  return (
    <svg viewBox="0 0 20 20" className={cls} fill="none" aria-hidden="true">
      <path
        d="M4 4h6a2 2 0 012 2v10a2 2 0 00-2-2H4V4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 4h-6a2 2 0 00-2 2v10a2 2 0 012-2h6V4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Admin overview — a gauge / activity dial. */
export function OverviewIcon() {
  return (
    <svg viewBox="0 0 20 20" className={cls} fill="none" aria-hidden="true">
      <path d="M3.5 14a7 7 0 1113 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 14l3-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Users — people. */
export function UsersIcon() {
  return (
    <svg viewBox="0 0 20 20" className={cls} fill="none" aria-hidden="true">
      <circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 16a4.5 4.5 0 019 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 5.5a2.5 2.5 0 010 5M14 16a4.5 4.5 0 00-2-3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
