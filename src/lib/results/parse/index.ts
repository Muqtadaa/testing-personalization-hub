import * as XLSX from "xlsx";
import type {
  ExperimentMonth,
  MonthlyProgramTotals,
  ParseStats,
  ParseWarning,
  ResultsDataset,
} from "@/lib/results/types";
import { parseMonthSheetName, type Row } from "./shared";
import { parseMonthSheet } from "./monthSheets";
import { parseTotalsBlock } from "./totalsBlock";
import { parseSummarySheet } from "./summary";
import { FORECAST_CHART_RE, FORECASTING_RE, fillForecastTargets, parseForecastChart } from "./forecast";
import { parseSourceData } from "./sourceData";
import { enrichExperiments } from "./enrich";

// Orchestrates parsing of the Revenue Workbook (+ optional Source Data
// workbook) into the normalized ResultsDataset. This is the only module that
// touches the xlsx library — everything downstream consumes the normalized
// model, which is also the seam where warehouse-API ingestion plugs in later.

export interface ParseResult {
  dataset: ResultsDataset;
  stats: ParseStats;
}

function sheetRows(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as Row[];
}

export function parseResultsDataset(
  workbookBytes: ArrayBuffer | Uint8Array,
  sourceBytes?: ArrayBuffer | Uint8Array | null,
): ParseResult {
  const warnings: ParseWarning[] = [];
  const wb = XLSX.read(workbookBytes, { type: "array" });

  const experiments: ExperimentMonth[] = [];
  const months: MonthlyProgramTotals[] = [];

  for (const name of wb.SheetNames) {
    if (!parseMonthSheetName(name)) continue;
    const rows = sheetRows(wb, name);
    experiments.push(...parseMonthSheet(name, rows, warnings));
    const totals = parseTotalsBlock(name, rows, warnings);
    if (totals) months.push(totals);
  }
  months.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  experiments.sort(
    (a, b) => a.monthKey.localeCompare(b.monthKey) || a.rawName.localeCompare(b.rawName),
  );

  const summary = wb.Sheets["Summary"] ? parseSummarySheet(sheetRows(wb, "Summary")) : null;
  if (!summary) warnings.push({ sheet: "Summary", message: "Summary sheet missing or unreadable." });

  const forecasts = wb.SheetNames.filter((n) => FORECAST_CHART_RE.test(n))
    .map((n) => {
      const year = Number(n.match(FORECAST_CHART_RE)![1]);
      const forecast = parseForecastChart(year, sheetRows(wb, n));
      const companion = wb.SheetNames.find(
        (c) => FORECASTING_RE.test(c) && Number(c.match(FORECASTING_RE)![1]) === year,
      );
      if (companion) fillForecastTargets(forecast, sheetRows(wb, companion));
      return forecast;
    })
    .sort((a, b) => a.year - b.year);

  let sourceCatalog: ResultsDataset["sourceCatalog"] = {};
  if (sourceBytes) {
    const sourceWb = XLSX.read(sourceBytes, { type: "array", cellDates: true });
    if (sourceWb.Sheets["All Data"]) {
      sourceCatalog = parseSourceData(
        XLSX.utils.sheet_to_json(sourceWb.Sheets["All Data"], {
          header: 1,
          defval: null,
        }) as Row[],
      );
    } else {
      warnings.push({ sheet: "All Data", message: "Source Data workbook has no 'All Data' sheet; enrichment skipped." });
    }
  }
  enrichExperiments(experiments, sourceCatalog);

  // Cross-check: monthly totals-block "Total" should match the Summary sheet.
  if (summary) {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    for (const m of months) {
      const [year, month] = m.monthKey.split("-").map(Number);
      const summaryValue = summary.monthly[monthNames[month - 1]]?.[year];
      if (
        m.total != null &&
        summaryValue != null &&
        Math.abs(m.total - summaryValue) > 0.01
      ) {
        warnings.push({
          sheet: m.monthKey,
          message: `Monthly total (${m.total.toFixed(2)}) differs from Summary sheet (${summaryValue.toFixed(2)}).`,
        });
      }
    }
  }

  const dataset: ResultsDataset = {
    schemaVersion: 1,
    source: { kind: "excel-upload", generatedAt: new Date().toISOString() },
    months,
    experiments,
    summary,
    forecasts,
    sourceCatalog,
    warnings,
  };

  const stats: ParseStats = {
    monthsFound: months.map((m) => m.monthKey),
    experimentCount: experiments.length,
    variationCount: experiments.reduce((sum, e) => sum + e.variations.length, 0),
    forecastYears: forecasts.map((f) => f.year),
    sourceExperimentCount: Object.keys(sourceCatalog).length,
    warningCount: warnings.length,
  };

  return { dataset, stats };
}
