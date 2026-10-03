"use client";

import { upliftColors } from "@/lib/results/chartColors";
import { formatCompactCurrency } from "@/lib/results/format";

// Campaign uplift ranking as an HTML bar list (long campaign names read better
// as rows than as a cramped horizontal-axis SVG chart). Clicking a row toggles
// the campaign cross-filter.

export interface CampaignDatum {
  campaign: string;
  count: number;
  uplift: number;
}

export default function CampaignRankingChart({
  data,
  selectedCampaign,
  onSelectCampaign,
}: {
  data: CampaignDatum[];
  selectedCampaign: string | null;
  onSelectCampaign: (campaign: string | null) => void;
}) {
  if (!data.length) {
    return (
      <p className="text-body-sm text-muted">
        No campaign data in view. Campaigns come from the Source Data workbook.
      </p>
    );
  }
  const max = Math.max(...data.map((d) => Math.abs(d.uplift)), 1);
  return (
    <ul className="space-y-1">
      {data.map((d) => {
        const active = selectedCampaign === d.campaign;
        const dimmed = selectedCampaign !== null && !active;
        const widthPct = Math.max((Math.abs(d.uplift) / max) * 100, 2);
        return (
          <li key={d.campaign}>
            <button
              type="button"
              onClick={() => onSelectCampaign(active ? null : d.campaign)}
              aria-pressed={active}
              title={`${d.campaign} — ${d.count} experiment${d.count === 1 ? "" : "s"}`}
              className={`group w-full rounded px-1.5 py-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
                active ? "bg-subtle" : "hover:bg-subtle/60"
              }`}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span
                  className={`truncate text-caption ${active ? "font-semibold text-body" : "text-muted group-hover:text-body"} ${dimmed ? "opacity-50" : ""}`}
                >
                  {d.campaign}
                </span>
                <span className={`shrink-0 font-mono text-caption ${d.uplift < 0 ? "text-critical-text" : "text-body"} ${dimmed ? "opacity-50" : ""}`}>
                  {formatCompactCurrency(d.uplift)}
                </span>
              </span>
              <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-subtle" aria-hidden>
                <span
                  className="block h-full rounded-full transition-[width]"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: d.uplift >= 0 ? upliftColors.positive : upliftColors.negative,
                    opacity: dimmed ? 0.35 : 1,
                  }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
