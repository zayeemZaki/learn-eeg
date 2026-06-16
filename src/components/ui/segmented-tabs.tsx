import Link from "next/link";

export interface SegmentedTab {
  /** Visible label, e.g. "All" or "Normal". */
  label: string;
  /** Destination URL the tab links to (shareable, server-driven). */
  href: string;
  /** Whether this tab represents the current view. */
  active: boolean;
  /** Optional count rendered as a subtle badge after the label. */
  count?: number;
}

/**
 * A segmented tab strip: a row of links styled as a single connected control,
 * with the active tab visually raised. Used for both the question-bank status
 * filter (All | Answered | Unanswered) and the atlas category switcher
 * (Normal | Abnormal) — one visual pattern, defined once.
 *
 * Tabs are real <Link>s, not client state, so every view has a shareable URL
 * and works without JavaScript. Active state is decided by the caller (which
 * knows the current route/param) and passed in per tab, so the active-state
 * logic lives at the call site, not duplicated here.
 *
 * Accessibility: rendered as a `tablist`, each tab carries `aria-current` when
 * active, shows a visible keyboard focus ring, and never relies on color alone
 * (the active tab is also raised onto the surface with a shadow). Hover/active
 * motion is suppressed under prefers-reduced-motion via globals.css.
 */
export function SegmentedTabs({ tabs }: { tabs: SegmentedTab[] }) {
  return (
    <div
      role="tablist"
      className="inline-flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-1 sm:w-auto"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          role="tab"
          aria-current={tab.active ? "page" : undefined}
          aria-selected={tab.active}
          className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:flex-none ${
            tab.active
              ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span
              className={`rounded-full px-1.5 text-xs tabular-nums ${
                tab.active
                  ? "bg-[var(--background)] text-[var(--muted)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
