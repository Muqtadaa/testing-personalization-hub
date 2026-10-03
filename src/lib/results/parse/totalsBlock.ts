import type { MonthlyProgramTotals, ParseWarning } from "@/lib/results/types";
import { num, parseMonthSheetName, str, toMonthKey, type Row } from "./shared";

// Each monthly sheet ends with a labeled totals block (labels in one column,
// values one column to the right):
//   Net Revenue Uplift   <n>
//   Optimizations        <n>
//   Personalizations     <n>
//   Recommendations      <n>
//   Total                <n>   ← monthly program outcome (matches Summary sheet)
//
// We scan for the labels rather than taking "the last 4 numerics in column O"
// (the old portal's approach), which broke on stray rows like "Q2 Total" and
// trailing blanks. "Total" is anchored to the same column as the other labels
// because experiment rows also contain the word "Total".

const LABELS = {
  netRevenueUplift: "net revenue uplift",
  optimizations: "optimizations",
  personalizations: "personalizations",
  recommendations: "recommendations",
} as const;

export function parseTotalsBlock(
  sheetName: string,
  rows: Row[],
  warnings: ParseWarning[],
): MonthlyProgramTotals | null {
  const ym = parseMonthSheetName(sheetName);
  if (!ym) return null;
  const monthKey = toMonthKey(ym.year, ym.month);

  const totals: MonthlyProgramTotals = {
    monthKey,
    netRevenueUplift: null,
    optimizations: null,
    personalizations: null,
    recommendations: null,
    total: null,
  };

  // Find the label column by locating any of the known program labels.
  let labelCol = -1;
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      const text = str(row[c]).toLowerCase();
      if (
        text === LABELS.netRevenueUplift ||
        text === LABELS.optimizations ||
        text === LABELS.personalizations ||
        text === LABELS.recommendations
      ) {
        labelCol = c;
        break;
      }
    }
    if (labelCol >= 0) break;
  }
  if (labelCol < 0) {
    warnings.push({ sheet: sheetName, message: "No labeled program totals block found." });
    return totals;
  }

  let sawProgramLabel = false;
  for (const row of rows) {
    const label = str(row[labelCol]).toLowerCase();
    const value = num(row[labelCol + 1]);
    if (label === LABELS.netRevenueUplift) totals.netRevenueUplift = value;
    else if (label === LABELS.optimizations) { totals.optimizations = value; sawProgramLabel = true; }
    else if (label === LABELS.personalizations) { totals.personalizations = value; sawProgramLabel = true; }
    else if (label === LABELS.recommendations) { totals.recommendations = value; sawProgramLabel = true; }
    // "Total" only counts once we're inside the labeled block, in the same column.
    else if (label === "total" && sawProgramLabel && totals.total == null) totals.total = value;
  }

  for (const key of ["optimizations", "personalizations", "recommendations", "total"] as const) {
    if (totals[key] == null) {
      warnings.push({ sheet: sheetName, message: `Totals block is missing a value for "${key}".` });
    }
  }
  return totals;
}
