import { type ReactNode } from "react";
import Link from "next/link";

import { ChevronLeftIcon } from "@/components/ui/icons";

interface BackLink {
  href: string;
  label: string;
}

interface PageHeaderProps {
  /** The page title, set in the display typeface. */
  title: string;
  /** Optional --muted supporting line under the title. */
  description?: ReactNode;
  /** Optional right-aligned slot for primary actions (e.g. a "New" button). */
  actions?: ReactNode;
  /** Optional back link rendered above the title (admin create/edit pages). */
  back?: BackLink;
}

/**
 * The standard page masthead — one title block for every (app) and (admin)
 * page, replacing the per-page `h1.font-display` + `p.text-muted` markup and
 * the duplicated "Back to …" links. Title and description sit on the left; an
 * optional actions slot (a button, usually) is right-aligned and wraps below on
 * narrow screens so it never overflows. The back link, when present, reproduces
 * the previous inline back-link styling (focus-visible ring, muted→foreground
 * hover) exactly.
 *
 * Pure presentation, no client state — safe to render in any server component.
 */
export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      {back ? (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-[var(--muted)] outline-none transition hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        >
          <ChevronLeftIcon />
          {back.label}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
