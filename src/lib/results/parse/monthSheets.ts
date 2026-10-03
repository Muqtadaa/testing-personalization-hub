import type {
  ExperimentMonth,
  ExperimentTag,
  ExperimentType,
  HoldbackRow,
  ParseWarning,
  VariationResult,
} from "@/lib/results/types";
import {
  findColumn,
  num,
  parseMonthSheetName,
  str,
  syntheticKey,
  toMonthKey,
  type Row,
} from "./shared";

// Parses the per-experiment rows on each monthly sheet. Row shapes vary by era:
//   2023:   one row per variation, all metrics on it, no Holdback column.
//   2024:   same, with an unnamed (empty-header) column where Holdback later sits.
//   2025+:  each variation has a "Total" row plus holdback sub-rows flagged
//           " true"/" false" (leading space in the workbook). The " false" row
//           carries the effective Normalized Revenue and Variation Revenue
//           Difference. Sub-rows sometimes leave Variation Number blank, which
//           the old portal skipped entirely — losing the uplift for those months.

interface Columns {
  name: number;
  variation: number;
  holdback: number;
  users: number;
  estRevenue: number;
  actualRevenue: number;
  normalizedRevenue: number;
  uplift: number;
}

function mapColumns(headerRow: Row): Columns | null {
  const header = headerRow.map((h) => str(h));
  const cols: Columns = {
    name: findColumn(header, ["Experiment Details"]),
    variation: findColumn(header, ["Variation Number"]),
    holdback: findColumn(header, ["Holdback"]),
    users: findColumn(header, ["Users"]),
    estRevenue: findColumn(header, ["Est. Revenue", "Revenue"]),
    actualRevenue: findColumn(header, ["Actual Revenue"]),
    normalizedRevenue: findColumn(header, ["Normalized Revenue"]),
    // The misspelled alias exists in some sheets — keep it.
    uplift: findColumn(header, ["Variation Revenue Difference", "Varation Revenue Difference"]),
  };
  if (cols.name < 0 || cols.variation < 0) return null;
  return cols;
}

function classify(rawName: string): { tag: ExperimentTag; type: ExperimentType } {
  if (/\[W-PZ/i.test(rawName)) return { tag: "W-PZ", type: "personalization" };
  if (/\[PZ/i.test(rawName)) return { tag: "PZ", type: "personalization" };
  if (/\[W-AB/i.test(rawName)) return { tag: "W-AB", type: "optimization" };
  if (/\[AB/i.test(rawName)) return { tag: "AB", type: "optimization" };
  // Untagged or otherwise-tagged tests ([FX] etc.) are optimizations — the
  // program has no third experiment category. Source Data enrichment can
  // still flip this to personalization.
  return { tag: null, type: "optimization" };
}

function emptyHoldbackRow(): HoldbackRow {
  return { users: null, estRevenue: null, actualRevenue: null, normalizedRevenue: null, uplift: null };
}

function readMetrics(row: Row, cols: Columns): HoldbackRow {
  return {
    users: cols.users >= 0 ? num(row[cols.users]) : null,
    estRevenue: cols.estRevenue >= 0 ? num(row[cols.estRevenue]) : null,
    actualRevenue: cols.actualRevenue >= 0 ? num(row[cols.actualRevenue]) : null,
    normalizedRevenue: cols.normalizedRevenue >= 0 ? num(row[cols.normalizedRevenue]) : null,
    uplift: cols.uplift >= 0 ? num(row[cols.uplift]) : null,
  };
}

export function parseMonthSheet(
  sheetName: string,
  rows: Row[],
  warnings: ParseWarning[],
): ExperimentMonth[] {
  const ym = parseMonthSheetName(sheetName);
  if (!ym || rows.length < 2) return [];
  const monthKey = toMonthKey(ym.year, ym.month);

  const cols = mapColumns(rows[0]);
  if (!cols) {
    warnings.push({ sheet: sheetName, message: "Could not locate expected column headers; sheet skipped." });
    return [];
  }
  if (cols.uplift < 0) {
    warnings.push({ sheet: sheetName, message: "No 'Variation Revenue Difference' column found — uplift will be missing for this month." });
  }

  const experiments: ExperimentMonth[] = [];
  let current: ExperimentMonth | null = null;
  let currentVariation: VariationResult | null = null;

  const finishExperiment = () => {
    if (!current) return;
    current.bestUplift = current.variations.reduce<number | null>(
      (best, v) => (v.uplift != null && (best == null || v.uplift > best) ? v.uplift : best),
      null,
    );
    experiments.push(current);
    current = null;
    currentVariation = null;
  };

  const attachHoldback = (variation: VariationResult, flag: "true" | "false", metrics: HoldbackRow) => {
    if (!variation.holdback) {
      variation.holdback = { included: emptyHoldbackRow(), excluded: emptyHoldbackRow() };
    }
    if (flag === "true") {
      variation.holdback.included = metrics;
    } else {
      variation.holdback.excluded = metrics;
      // The non-holdback population is the measured one: its normalized revenue
      // and uplift are the variation's effective values.
      if (metrics.normalizedRevenue != null) variation.normalizedRevenue = metrics.normalizedRevenue;
      if (metrics.uplift != null) variation.uplift = metrics.uplift;
    }
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const variationText = str(row[cols.variation]);
    const holdbackText = cols.holdback >= 0 ? str(row[cols.holdback]).toLowerCase() : "";

    if (variationText === "Total") {
      // New experiment.
      finishExperiment();
      const rawName = str(row[cols.name]);
      if (!rawName) continue;
      // Tolerate stray punctuation after the id ("4830857442099200. - [PZ] …").
      const idMatch = rawName.match(/^(\d{8,})[.\s]*-\s*/);
      const { tag, type } = classify(rawName);
      const metrics = readMetrics(row, cols);
      current = {
        key: idMatch ? idMatch[1] : syntheticKey(rawName),
        experimentId: idMatch ? idMatch[1] : null,
        rawName,
        displayName: null,
        monthKey,
        type,
        tag,
        campaign: null,
        startDate: null,
        endDate: null,
        webOrderImpacted: null,
        totals: { users: metrics.users, estRevenue: metrics.estRevenue, actualRevenue: metrics.actualRevenue },
        variations: [],
        bestUplift: null,
      };
      continue;
    }

    if (!current) continue;

    const isVariationLabel = /^(original|variation)/i.test(variationText);
    const metrics = readMetrics(row, cols);

    if (isVariationLabel) {
      const isHoldbackSubRow = holdbackText === "true" || holdbackText === "false";
      if (isHoldbackSubRow && currentVariation && currentVariation.label === variationText) {
        // 2026-style sub-row repeating the variation label with a holdback flag.
        attachHoldback(currentVariation, holdbackText as "true" | "false", metrics);
        continue;
      }
      // New variation. On 2025+ sheets this is the variation's "Total" row
      // (holdback col says "Total"); on 2023/24 it carries everything.
      currentVariation = {
        label: variationText,
        enrichedLabel: null,
        isControl: /^original/i.test(variationText),
        users: metrics.users,
        estRevenue: metrics.estRevenue,
        actualRevenue: metrics.actualRevenue,
        normalizedRevenue: metrics.normalizedRevenue,
        uplift: metrics.uplift,
        holdback: null,
      };
      current.variations.push(currentVariation);
      if (isHoldbackSubRow) {
        attachHoldback(currentVariation, holdbackText as "true" | "false", metrics);
      }
      continue;
    }

    // Holdback sub-rows: flag may live in the Holdback column with a blank
    // Variation Number (2025 sheets), or in the Variation Number column itself.
    const variationFlag = variationText.toLowerCase();
    const flag =
      holdbackText === "true" || holdbackText === "false"
        ? holdbackText
        : variationFlag === "true" || variationFlag === "false"
          ? variationFlag
          : null;
    if (flag && currentVariation) {
      attachHoldback(currentVariation, flag as "true" | "false", metrics);
    }
  }
  finishExperiment();

  return experiments;
}
