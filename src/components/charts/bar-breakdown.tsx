"use client";

/**
 * A horizontal bar chart for a labelled breakdown — accuracy per category /
 * difficulty, or counts per category. Horizontal so long category labels stay
 * readable on narrow screens. Presentational; the page computes data via stats.ts.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useReducedMotion } from "@/components/charts/use-reduced-motion";
import { accuracyFill } from "@/components/charts/accuracy-tone";

export interface BarBreakdownItem {
  label: string;
  value: number;
  /** Optional token-derived category colour; label remains visible on the axis. */
  color?: string;
  /** Optional context shown in the tooltip (e.g. "12 of 20 correct"). */
  hint?: string;
}

interface BarBreakdownProps {
  data: BarBreakdownItem[];
  ariaLabel: string;
  /** Append to the value in tooltip/axis (e.g. "%"). Default "". */
  unit?: string;
  /** Cap the X domain (e.g. 100 for percentages). Default: auto. */
  max?: number;
  /** Per-bar height in px; total height scales with item count. Default 34. */
  barSize?: number;
  /**
   * Colour each bar by its accuracy band instead of a flat --accent. Opt-in: this
   * chart also renders content-coverage COUNTS, where a low bar just means "few
   * questions here" and tinting it red would invent a judgement the data doesn't
   * support. Only pass this where the value really is an accuracy percentage.
   */
  semantic?: boolean;
}

export function BarBreakdown({
  data,
  ariaLabel,
  unit = "",
  max,
  barSize = 34,
  semantic = false,
}: BarBreakdownProps) {
  const reduced = useReducedMotion();
  const height = Math.max(120, data.length * (barSize + 14) + 24);

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
          barCategoryGap={10}
        >
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis
            type="number"
            domain={max != null ? [0, max] : [0, "auto"]}
            allowDecimals={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            stroke="var(--border)"
            tickLine={false}
            tickFormatter={(v) => `${v}${unit}`}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            stroke="var(--border)"
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
              color: "var(--foreground)",
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--muted)" }}
            formatter={(value, _name, item) => {
              const hint = (item?.payload as BarBreakdownItem | undefined)?.hint;
              return [hint ?? `${value}${unit}`, ""];
            }}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            isAnimationActive={!reduced}
            maxBarSize={barSize}
            label={{
              position: "right",
              offset: 8,
              // Recharts types the formatter's argument as RenderableText (which
              // includes undefined), not number — so guard rather than assert.
              formatter: (v) => (v == null ? "" : `${v}${unit}`),
              fill: "var(--foreground)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {data.map((item) => (
              <Cell
                key={item.label}
                fill={item.color ?? (semantic ? accuracyFill(item.value) : "var(--accent)")}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
