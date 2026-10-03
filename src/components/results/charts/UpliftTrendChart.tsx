"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExperimentMonth } from "@/lib/results/types";
import { chart, upliftColors } from "@/lib/results/chartColors";
import { formatCompactCurrency, formatCurrency, formatMonthKey } from "@/lib/results/format";
import { AXIS_LINE, AXIS_TICK, GRID_PROPS, TooltipCard } from "./theme";

// Best-variation uplift per month for one experiment (detail page).

export default function UpliftTrendChart({ months }: { months: ExperimentMonth[] }) {
  const data = months.map((m) => ({
    monthKey: m.monthKey,
    uplift: m.bestUplift,
    users: m.totals.users,
  }));
  return (
    <div role="img" aria-label="Best-variation incremental uplift by month">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis
            dataKey="monthKey"
            tick={AXIS_TICK}
            axisLine={AXIS_LINE}
            tickLine={false}
            tickFormatter={(k: string) => formatMonthKey(k)}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCompactCurrency(v)}
            width={56}
          />
          <ReferenceLine y={0} stroke={chart.mutedText} strokeWidth={1} />
          <Tooltip
            cursor={{ fill: "rgba(56, 53, 63, 0.05)" }}
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!active || !d) return null;
              return (
                <TooltipCard
                  title={formatMonthKey(d.monthKey)}
                  rows={[
                    { name: "Best uplift", value: formatCurrency(d.uplift) },
                    { name: "Users", value: d.users == null ? "—" : d.users.toLocaleString("en-US") },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="uplift" name="Uplift" maxBarSize={48}>
            {data.map((d) => (
              <Cell
                key={d.monthKey}
                fill={(d.uplift ?? 0) >= 0 ? upliftColors.positive : upliftColors.negative}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
