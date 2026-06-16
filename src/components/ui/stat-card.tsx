import { type ReactNode } from "react";

import { Card } from "@/components/ui/card";

interface StatCardProps {
  /** --muted descriptor, e.g. "Total users". */
  label: string;
  /** The emphasised figure; pre-formatted by the caller (e.g. "1,204", "87%"). */
  value: ReactNode;
  /** Optional sub-line under the value for context (e.g. "this week"). */
  hint?: string;
  /** Optional extra content (e.g. the accuracy accent bar) below the figure. */
  children?: ReactNode;
}

/**
 * A single overview metric: a quiet --muted label above a large figure set in
 * the display font, with optional hint and trailing content. Built on the
 * shared Card so admin stats match the rest of the app's surfaces. Numbers use
 * tabular-nums so a row of cards aligns. Restrained by design — the only
 * decoration allowed is a single thin accent bar passed in as children.
 */
export function StatCard({ label, value, hint, children }: StatCardProps) {
  return (
    <Card className="flex flex-col">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p> : null}
      {children}
    </Card>
  );
}
