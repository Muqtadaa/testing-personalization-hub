"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ExperimentType } from "@/lib/results/types";
import { typeColors } from "@/lib/results/chartColors";
import { formatCurrency } from "@/lib/results/format";
import { TooltipCard } from "./theme";

// Experiment mix by type. Clicking a slice toggles the type cross-filter.

export interface TypeMixDatum {
  type: ExperimentType;
  count: number;
  uplift: number;
}

const TYPE_LABEL: Record<ExperimentType, string> = {
  optimization: "Optimizations",
  personalization: "Personalizations",
  other: "Other",
};

export default function TypeMixDonut({
  data,
  selectedTypes,
  onToggleType,
}: {
  data: TypeMixDatum[];
  selectedTypes: ExperimentType[];
  onToggleType: (type: ExperimentType) => void;
}) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  return (
    <div role="img" aria-label="Experiment mix by type. Click a segment to filter by type.">
      <ResponsiveContainer width="100%" height={170}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Tooltip
            content={({ active, payload }) => {
              const d = payload?.[0]?.payload as TypeMixDatum | undefined;
              if (!active || !d) return null;
              return (
                <TooltipCard
                  title={TYPE_LABEL[d.type]}
                  rows={[
                    { name: "Experiments", value: String(d.count) },
                    { name: "Net uplift", value: formatCurrency(d.uplift) },
                  ]}
                />
              );
            }}
          />
          <Pie
            data={data}
            dataKey="count"
            nameKey="type"
            innerRadius={46}
            outerRadius={72}
            paddingAngle={2}
            strokeWidth={0}
            cursor="pointer"
            onClick={(entry) => {
              const t = (entry as unknown as { type?: ExperimentType })?.type;
              if (t) onToggleType(t);
            }}
          >
            {data.map((d) => {
              const dimmed = selectedTypes.length > 0 && !selectedTypes.includes(d.type);
              return <Cell key={d.type} fill={typeColors[d.type]} fillOpacity={dimmed ? 0.3 : 1} />;
            })}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-1 space-y-1">
        {data.map((d) => {
          const active = selectedTypes.includes(d.type);
          return (
            <li key={d.type}>
              <button
                type="button"
                onClick={() => onToggleType(d.type)}
                aria-pressed={active}
                className={`flex w-full items-center gap-2 rounded px-1.5 py-0.5 text-caption transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
                  active ? "bg-subtle font-semibold text-body" : "text-muted hover:text-body"
                }`}
              >
                <span aria-hidden className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: typeColors[d.type] }} />
                {TYPE_LABEL[d.type]}
                <span className="ml-auto font-mono">
                  {d.count}
                  {total > 0 && <span className="text-subtle"> · {Math.round((d.count / total) * 100)}%</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
