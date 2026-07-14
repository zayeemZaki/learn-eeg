import { type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { TrendUpIcon, TrendDownIcon, TrendFlatIcon } from "@/components/ui/icons";

export interface StatDelta {
  /** Signed change in the metric's own unit. `null` renders nothing — with no prior period, any figure would be an artifact of the user being new. */
  value: number | null;
  /** Unit suffix, e.g. "%" or " pts". */
  unit?: string;
  /** What the comparison is against, e.g. "vs previous 30 days". */
  label: string;
  /** Does a RISE mean things got better? Drives the colour, so a metric where falling is good still reads green. */
  higherIsBetter?: boolean;
}

interface StatTileProps {
  label: string;
  /** The emphasised figure; pre-formatted by the caller (e.g. "1,204", "87%"). */
  value: ReactNode;
  delta?: StatDelta;
  /** Context line under the value. Shown only when there's no delta label. */
  sub?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

// Direction is carried by the arrow, the sign, AND the colour, so a colour-blind
// reader loses only the third.
function DeltaPill({ value, unit = "", label, higherIsBetter = true }: StatDelta) {
  if (value == null) return null;

  const improved = higherIsBetter ? value > 0 : value < 0;
  const flat = value === 0;

  const tone = flat
    ? "bg-[var(--background)] text-[var(--muted)]"
    : improved
      ? "bg-success-soft text-success"
      : "bg-danger-soft text-danger";

  const Arrow = flat ? TrendFlatIcon : value > 0 ? TrendUpIcon : TrendDownIcon;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const magnitude = Math.abs(value);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}
      aria-label={`${flat ? "No change" : improved ? "Up" : "Down"} ${magnitude}${unit}, ${label}`}
    >
      <Arrow />
      <span aria-hidden="true">
        {sign}
        {magnitude}
        {unit}
      </span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  delta,
  sub,
  icon,
  children,
  className = "",
}: StatTileProps) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
        {icon ? <span className="text-[var(--muted)]">{icon}</span> : null}
        {label}
      </p>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-none tracking-tight tabular-nums">
          {value}
        </p>
        {delta ? <DeltaPill {...delta} /> : null}
      </div>

      {delta?.value != null ? (
        <p className="mt-1.5 text-xs text-[var(--muted)]">{delta.label}</p>
      ) : sub ? (
        <p className="mt-1.5 text-xs text-[var(--muted)]">{sub}</p>
      ) : null}

      {children}
    </Card>
  );
}
