import { type ReactNode } from "react";
import Link from "next/link";

interface EmptyStateAction {
  href: string;
  label: string;
}

interface EmptyStateProps {
  /** The primary message — what's empty and, ideally, why. */
  message: ReactNode;
  /** Optional small print under the message. */
  hint?: ReactNode;
  /** Optional leading glyph, centred above the message. */
  icon?: ReactNode;
  /** Optional inline link action (e.g. "View all questions"). */
  action?: EmptyStateAction;
}

/**
 * The shared empty-state panel — replaces the half-dozen copies of the
 * `rounded-xl border-dashed p-8 text-center text-muted` placeholder scattered
 * across the lists, including the question-bank variant that adds a "View all"
 * link. A dashed hairline frame on the page background, centred message, with an
 * optional icon and a single inline action. Real, intentional empty states —
 * not giant blank filler cards.
 */
export function EmptyState({ message, hint, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
      {icon ? <div className="text-[var(--muted)]">{icon}</div> : null}
      <p className="text-[var(--foreground)]">{message}</p>
      {hint ? <p className="text-sm text-[var(--muted)]">{hint}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-1 inline-block text-sm font-medium text-[var(--accent)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
