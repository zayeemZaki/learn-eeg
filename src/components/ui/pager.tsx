import Link from "next/link";

import { type PageInfo } from "@/lib/pagination";

interface PagerProps {
  /** Derived page state from `pageInfo()`. */
  info: PageInfo;
  /**
   * Build the href for a given page number. The caller owns this because it knows
   * which OTHER params must survive the jump (a status filter, a category) — a
   * pager that built its own URLs would silently drop them.
   */
  hrefForPage: (page: number) => string;
  /** What the rows are, for the count line and labels: "questions", "users". */
  itemLabel: string;
}

const linkClass =
  "inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground)] outline-none transition hover:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

// Disabled edges render as spans, not disabled links: there is no destination, so
// there should be nothing in the tab order pretending otherwise.
const disabledClass =
  "inline-flex items-center rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted)] opacity-60";

/**
 * Previous/next pagination with a "showing X–Y of Z" count.
 *
 * Deliberately not a numbered page strip: these lists are browsed, not
 * random-accessed, and prev/next keeps the control legible on a phone while the
 * count line carries the sense of scale that page numbers would.
 *
 * Real <Link>s, so pagination is server-rendered and shareable like every other
 * filter here. Renders nothing at all when everything fits on one page — a pager
 * around a 4-row list is noise.
 *
 * A11y: labelled `<nav>`, with prev/next carrying their own descriptive
 * aria-labels (so a screen reader hears "Previous page of questions", not a bare
 * "Previous"), and the live count announced via the surrounding status text.
 */
export function Pager({ info, hrefForPage, itemLabel }: PagerProps) {
  if (info.totalPages <= 1) return null;

  return (
    <nav
      aria-label={`${itemLabel} pagination`}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-sm text-[var(--muted)] tabular-nums">
        Showing {info.from.toLocaleString()}–{info.to.toLocaleString()} of{" "}
        {info.totalRows.toLocaleString()} {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        {info.hasPrevious ? (
          <Link
            href={hrefForPage(info.page - 1)}
            aria-label={`Previous page of ${itemLabel}`}
            className={linkClass}
          >
            ← Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-hidden>
            ← Previous
          </span>
        )}

        <span className="px-1 text-sm text-[var(--muted)] tabular-nums">
          Page {info.page.toLocaleString()} of {info.totalPages.toLocaleString()}
        </span>

        {info.hasNext ? (
          <Link
            href={hrefForPage(info.page + 1)}
            aria-label={`Next page of ${itemLabel}`}
            className={linkClass}
          >
            Next →
          </Link>
        ) : (
          <span className={disabledClass} aria-hidden>
            Next →
          </span>
        )}
      </div>
    </nav>
  );
}
