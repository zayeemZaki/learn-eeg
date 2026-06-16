import { type ReactNode } from "react";

import { Card } from "@/components/ui/card";

interface StatTileProps {
  /** Quiet --muted descriptor, e.g. "Total users". */
  label: string;
  /** The emphasised figure; pre-formatted by the caller (e.g. "1,204", "87%"). */
  value: ReactNode;
  /** Optional context line under the value (e.g. "128 of 147 correct"). */
  sub?: ReactNode;
  /** Optional leading glyph, shown beside the label. */
  icon?: ReactNode;
  /** Optional trailing content under the figure (e.g. a thin accuracy bar). */
  children?: ReactNode;
  className?: string;
}

/**
 * A single overview metric — the canonical stat tile used by both dashboards.
 * A quiet --muted label (with an optional leading glyph) above a large figure in
 * the display font, with an optional sub-line and trailing slot. Built on the
 * shared Card so tiles match every other surface; figures use tabular-nums so a
 * row of tiles aligns. Restrained by design — the only decoration is whatever
 * thin element a caller passes as children (e.g. the accuracy bar).
 *
 * Supersedes the old StatCard (same shape, plus the icon + sub affordances the
 * shell's dashboards need).
 */
export function StatTile({ label, value, sub, icon, children, className = "" }: StatTileProps) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
        {icon ? <span className="text-[var(--muted)]">{icon}</span> : null}
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {sub ? <p className="mt-1 text-sm text-[var(--muted)]">{sub}</p> : null}
      {children}
    </Card>
  );
}
