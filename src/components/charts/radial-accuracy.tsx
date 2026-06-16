"use client";

/**
 * A radial gauge for a single accuracy percentage — the headline figure on a
 * dashboard. The page passes the already-computed percent (0–100) from
 * stats.ts; this renders the ring and the centred number. Tokens only (--accent
 * arc on a --border track), responsive, reduced-motion aware. Purely
 * presentational — the surrounding card supplies the label and any sub-text.
 */
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

import { useReducedMotion } from "@/components/charts/use-reduced-motion";

interface RadialAccuracyProps {
  /** 0–100, or null when there's nothing to measure (renders "—"). */
  percent: number | null;
  /** Accessible label, e.g. "Overall accuracy". */
  ariaLabel: string;
  /** Diameter in px. Default 168. */
  size?: number;
}

export function RadialAccuracy({ percent, ariaLabel, size = 168 }: RadialAccuracyProps) {
  const reduced = useReducedMotion();
  const value = percent ?? 0;
  const data = [{ name: "accuracy", value }];

  return (
    <div
      role="img"
      aria-label={`${ariaLabel}: ${percent != null ? `${percent}%` : "no data"}`}
      className="relative mx-auto"
      style={{ width: size, height: size }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          innerRadius="74%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
        >
          {/* Fixes the 0–100 domain so the arc length maps to the percentage. */}
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            dataKey="value"
            angleAxisId={0}
            cornerRadius={999}
            fill="var(--accent)"
            background={{ fill: "var(--border)" }}
            isAnimationActive={!reduced}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums tracking-tight">
          {percent != null ? `${percent}%` : "—"}
        </span>
      </div>
    </div>
  );
}
