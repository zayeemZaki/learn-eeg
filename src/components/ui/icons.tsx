/**
 * The shared inline-SVG glyph set. These were previously redeclared per page
 * (the questions list, the answer component, the admin tables) with identical
 * paths; collecting them here keeps every check / cross / image hint visually
 * identical and gives the new shell + EmptyState a single source for icons.
 *
 * All are presentational: `fill="none"`, `currentColor` stroke (so they inherit
 * the surrounding text colour / Badge tone) and `aria-hidden` (the adjacent
 * label carries the meaning — icons are never the sole signal). Size via the
 * `className` prop; callers default to a sensible inline size.
 */
interface IconProps {
  className?: string;
}

/** Check mark — "Correct" / "Answered" / completed states. */
export function CheckIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Cross — "Incorrect" / "Your answer" / error states. */
export function CrossIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Dashed ring — the "Not answered" marker. */
export function CircleDashIcon({ className = "h-4 w-4 shrink-0" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

/** Picture frame — the "has an EEG image" hint. */
export function ImageIcon({ className = "h-3.5 w-3.5 shrink-0" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
      <path d="M3 12l3.5-3.5 2.5 2.5 2-2 2 2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Left chevron — back links. */
export function ChevronLeftIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
