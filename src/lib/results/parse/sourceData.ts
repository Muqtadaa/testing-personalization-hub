import type { SourceExperiment } from "@/lib/results/types";
import { findColumn, num, str, toIsoDate, type Row } from "./shared";

// Source Data workbook, "All Data" sheet: one row per variation per experiment.
// Provides clean experience names, campaign, start/end dates, type
// (Optimization/Personalization), and variation labels keyed by Experiment ID.

export function parseSourceData(rows: Row[]): Record<string, SourceExperiment> {
  if (rows.length < 2) return {};
  const header = rows[0].map((h) => str(h));
  const cols = {
    startDate: findColumn(header, ["Start Date"]),
    endDate: findColumn(header, ["End Date"]),
    type: findColumn(header, ["Type"]),
    campaign: findColumn(header, ["Campaign Name"]),
    expName: findColumn(header, ["Experience Name"]),
    id: findColumn(header, ["Experiment ID"]),
    variation: findColumn(header, ["Variations"]),
    trafficSplit: findColumn(header, ["Traffic Split"]),
    webOrderImpacted: findColumn(header, ["Web Order Impacted?"]),
  };
  if (cols.id < 0) return {};

  const index: Record<string, SourceExperiment> = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = str(row[cols.id]);
    if (!id) continue;

    if (!index[id]) {
      // Literal "N/A" campaign names in the source sheet mean "no campaign".
      const campaignRaw = cols.campaign >= 0 ? str(row[cols.campaign]) : "";
      index[id] = {
        id,
        expName: cols.expName >= 0 ? str(row[cols.expName]) : "",
        type: cols.type >= 0 ? str(row[cols.type]) : "",
        campaign: campaignRaw && !/^n\/?a$/i.test(campaignRaw) ? campaignRaw : null,
        startDate: cols.startDate >= 0 ? toIsoDate(row[cols.startDate]) : null,
        endDate: cols.endDate >= 0 ? toIsoDate(row[cols.endDate]) : null,
        webOrderImpacted: cols.webOrderImpacted >= 0 ? str(row[cols.webOrderImpacted]) || null : null,
        variations: [],
      };
    }

    const label = cols.variation >= 0 ? str(row[cols.variation]) : "";
    if (label) {
      index[id].variations.push({
        label,
        trafficSplit: cols.trafficSplit >= 0 ? num(row[cols.trafficSplit]) : null,
      });
      // Variations can span different windows; keep the widest date range.
      const start = cols.startDate >= 0 ? toIsoDate(row[cols.startDate]) : null;
      const end = cols.endDate >= 0 ? toIsoDate(row[cols.endDate]) : null;
      if (start && (!index[id].startDate || start < index[id].startDate)) index[id].startDate = start;
      if (end && (!index[id].endDate || end > index[id].endDate)) index[id].endDate = end;
    }
  }
  return index;
}
