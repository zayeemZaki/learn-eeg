import { type ReactNode } from "react";

import { Card } from "@/components/ui/card";

interface SectionPanelProps {
  /** Section label, set quiet and small above the content. */
  title: ReactNode;
  /** Optional right-aligned slot on the title row (a count, a small action). */
  aside?: ReactNode;
  /** The grouped content. */
  children: ReactNode;
  className?: string;
}

/**
 * A titled container for a group of related content — the consistent
 * section/card the brief asks for. Built on the shared Card so it matches every
 * other surface, with a quiet --muted section label and an optional right-hand
 * aside (a count, a small action) on the title row. Used to frame grouped blocks
 * like the dashboard's "Continue" section and the admin overview's "Recent
 * signups" list, so grouped content reads consistently everywhere.
 */
export function SectionPanel({ title, aside, children, className = "" }: SectionPanelProps) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
        {aside ? <div className="shrink-0 text-sm text-[var(--muted)]">{aside}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
