"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyProgramTotals } from "@/lib/results/types";
import { programColors } from "@/lib/results/chartColors";
import { formatCompactCurrency, formatMonthKey, monthName, splitMonthKey } from "@/lib/results/format";
import { AXIS_LINE, AXIS_TICK, CurrencyTooltip, GRID_PROPS } from "./theme";

// Stacked monthly program composition (Optimizations / Personalizations /
// Recommendations) for one year, from the workbook's labeled totals blocks.

const SERIES = [
  { key: "optimizations", name: "Optimizations", color: programColors.optimizations },
  { key: "personalizations", name: "Personalizations", color: programColors.personalizations },
  { key: "recommendations", name: "Recommendations", color: programColors.recommendations },
] as const;

export default function ProgramCompositionChart({
  months,
  year,
}: {
  months: MonthlyProgramTotals[];
  year: number;
}) {
  const data = months
    .filter((m) => splitMonthKey(m.monthKey).year === year)
    .map((m) => ({
      monthKey: m.monthKey,
      month: monthName(splitMonthKey(m.monthKey).month),
      optimizations: m.optimizations ?? 0,
      personalizations: m.personalizations ?? 0,
      recommendations: m.recommendations ?? 0,
    }));

  return (
    <div role="img" aria-label={`Monthly ${year} revenue by program`}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="month" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCompactCurrency(v)}
            width={52}
          />
          <Tooltip
            content={
              <CurrencyTooltip
                titleFormatter={(label) => {
                  const row = data.find((d) => d.month === label);
                  return row ? formatMonthKey(row.monthKey) : String(label);
                }}
              />
            }
            cursor={{ fill: "rgba(56, 53, 63, 0.05)" }}
          />
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} stackId="program" fill={s.color} maxBarSize={44} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
