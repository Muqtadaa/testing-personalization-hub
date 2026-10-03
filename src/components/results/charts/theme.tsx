"use client";

import { chart } from "@/lib/results/chartColors";
import { formatCurrency } from "@/lib/results/format";

// Shared Recharts theming: one axis/grid/tooltip vocabulary across every
// Results chart, themed to the hub's tokens (hexes mirrored in chartColors.ts
// because SVG attributes can't consume Tailwind classes).

export const AXIS_TICK = { fontSize: 11, fill: chart.subtleText } as const;
export const AXIS_LINE = { stroke: chart.hairline } as const;
export const GRID_PROPS = { stroke: chart.hairline, strokeDasharray: "0", vertical: false } as const;

interface TooltipRow {
  name: string;
  value: string;
  swatch?: string;
}

/** Hub-styled tooltip body. Charts pass rows pre-formatted. */
export function TooltipCard({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-md border border-muted/30 bg-white px-3 py-2 shadow-card">
      <p className="text-caption font-semibold text-body">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-2 text-caption text-muted">
            {r.swatch && (
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: r.swatch }}
              />
            )}
            <span>{r.name}</span>
            <span className="ml-auto pl-4 font-mono text-body">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TooltipPayloadEntry {
  name?: string | number;
  value?: number | string | null;
  color?: string;
}

/** Default tooltip for single/multi series charts of currency values.
 *  Typed locally — Recharts injects active/payload/label at render time. */
export function CurrencyTooltip({
  active,
  payload,
  label,
  titleFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: unknown;
  titleFormatter?: (label: unknown) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <TooltipCard
      title={titleFormatter ? titleFormatter(label) : String(label ?? "")}
      rows={payload
        .filter((p) => p.value != null)
        .map((p) => ({
          name: String(p.name),
          value: formatCurrency(Number(p.value)),
          swatch: p.color,
        }))}
    />
  );
}
