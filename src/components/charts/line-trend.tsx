"use client";

/**
 * A small, dumb line chart for a dense daily time series (activity, signups,
 * attempts). The page computes the data server-side via stats.ts and passes it
 * as the `data` prop — this component never fetches or aggregates. Tokens only
 * (--accent for the line, --border for the grid/axes, --muted for labels), a
 * responsive container so it never overflows mobile, and animation suppressed
 * under prefers-reduced-motion.
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useReducedMotion } from "@/components/charts/use-reduced-motion";

export interface LineTrendPoint {
  /** ISO yyyy-mm-dd day key. */
  date: string;
  count: number;
}

interface LineTrendProps {
  data: LineTrendPoint[];
  /** Accessible label for the chart region. */
  ariaLabel: string;
  /** Pixel height of the plot (responsive width). Default 200. */
  height?: number;
}

/** Show the month/day for the axis; full date is in the tooltip. */
function shortDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function LineTrend({ data, ariaLabel, height = 200 }: LineTrendProps) {
  const reduced = useReducedMotion();

  // Thin the X tick labels so a 30-day window doesn't crowd on mobile: show at
  // most ~8 labels regardless of series length.
  const tickEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="lineTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDay}
            interval={tickEvery - 1}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            stroke="var(--border)"
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            width={32}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            stroke="var(--border)"
            tickLine={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--muted)" }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#lineTrendFill)"
            isAnimationActive={!reduced}
            dot={false}
            activeDot={{ r: 3, fill: "var(--accent)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
