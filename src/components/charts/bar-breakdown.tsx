"use client";

/**
 * A horizontal bar chart for a labelled breakdown — accuracy per category /
 * difficulty, or counts per category (content coverage). Horizontal so long
 * category labels stay readable and the chart degrades gracefully on narrow
 * screens. The page computes data via stats.ts and passes it in; this stays
 * presentational. Tokens only, responsive container, reduced-motion aware.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useReducedMotion } from "@/components/charts/use-reduced-motion";

export interface BarBreakdownItem {
  label: string;
  value: number;
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
}

export function BarBreakdown({
  data,
  ariaLabel,
  unit = "",
  max,
  barSize = 34,
}: BarBreakdownProps) {
  const reduced = useReducedMotion();
  const height = Math.max(120, data.length * (barSize + 14) + 24);

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
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
              borderRadius: 8,
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
          >
            {data.map((item) => (
              <Cell key={item.label} fill="var(--accent)" />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v) => `${v}${unit}`}
              style={{ fill: "var(--muted)", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
