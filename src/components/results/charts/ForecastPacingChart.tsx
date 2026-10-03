"use client";

import {
  Area,
  ComposedChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ForecastYear } from "@/lib/results/types";
import { forecastColors } from "@/lib/results/chartColors";
import { formatCompactCurrency } from "@/lib/results/format";
import { AXIS_LINE, AXIS_TICK, CurrencyTooltip, GRID_PROPS } from "./theme";

// Monthly actuals vs forecast for the forecast year, with prior-year actuals
// as quiet reference lines. Months without a reported actual stay empty (the
// line stops at the last reported month rather than dropping to zero).

export default function ForecastPacingChart({ forecast }: { forecast: ForecastYear }) {
  const priorYears = Object.keys(forecast.monthly[0]?.priorActuals ?? {})
    .map(Number)
    .sort((a, b) => b - a); // most recent prior year first

  const data = forecast.monthly.map((m) => ({
    month: m.month.slice(0, 3),
    forecast: m.forecast,
    actual: m.actual && m.actual !== 0 ? m.actual : null,
    ...Object.fromEntries(priorYears.map((y) => [`prior${y}`, m.priorActuals[y]])),
  }));

  return (
    <div role="img" aria-label={`Monthly ${forecast.year} actual revenue versus forecast`}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="month" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCompactCurrency(v)}
            width={52}
          />
          <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: forecastColors.prior2 }} />
          {priorYears.map((y, i) => (
            <Line
              key={y}
              dataKey={`prior${y}`}
              name={`${y} actual`}
              stroke={i === 0 ? forecastColors.prior1 : forecastColors.prior2}
              strokeWidth={1.5}
              dot={false}
              type="monotone"
            />
          ))}
          <Line
            dataKey="forecast"
            name={`${forecast.year} forecast`}
            stroke={forecastColors.forecast}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            type="monotone"
          />
          <Area
            dataKey="actual"
            name={`${forecast.year} actual`}
            stroke={forecastColors.actual}
            strokeWidth={2.5}
            fill={forecastColors.actual}
            fillOpacity={0.14}
            dot={{ r: 3, fill: forecastColors.actual, strokeWidth: 0 }}
            type="monotone"
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-caption text-muted">
        <LegendSwatch color={forecastColors.actual} label={`${forecast.year} actual`} />
        <LegendSwatch color={forecastColors.forecast} label={`${forecast.year} forecast`} dashed />
        {priorYears.map((y, i) => (
          <LegendSwatch key={y} color={i === 0 ? forecastColors.prior1 : forecastColors.prior2} label={`${y} actual`} />
        ))}
      </div>
    </div>
  );
}

function LegendSwatch({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-0.5 w-4 rounded-full"
        style={dashed ? { backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` } : { backgroundColor: color }}
      />
      {label}
    </span>
  );
}
