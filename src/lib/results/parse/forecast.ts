import type { ForecastQuarter, ForecastYear } from "@/lib/results/types";
import { num, str, type Row } from "./shared";

// Generalized forecast parsing: any sheet named "<YYYY> Forecast Chart"
// produces a ForecastYear (so a "2027 Forecast Chart" works with no code
// change). A companion "<YYYY> Forecasting" sheet can fill missing monthly
// forecast targets. Layout per the 2026 sheets:
//   Month | <Y-2> Valuation | <Y-1> Valuation | <Y> Forecast | <Y> Current | …
//   …and a quarterly block headed by a "Quarter" cell with
//   Forecast / Actual / Delta / % Change / Theme to its right.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const FORECAST_CHART_RE = /^(\d{4})\s+Forecast Chart$/i;
export const FORECASTING_RE = /^(\d{4})\s+Forecasting$/i;

export function parseForecastChart(year: number, rows: Row[]): ForecastYear {
  const monthly = MONTH_NAMES.map((month) => ({
    month,
    priorActuals: {} as Record<number, number | null>,
    forecast: null as number | null,
    actual: null as number | null,
  }));
  const quarters: ForecastQuarter[] = [];

  // Header row: has a "Month" cell and at least one year reference.
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => str(c));
    if (cells.some((c) => /^month$/i.test(c)) && cells.some((c) => /\d{4}/.test(c))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx >= 0) {
    const header = rows[headerIdx].map((c) => str(c));
    const monthCol = header.findIndex((h) => /^month$/i.test(h));
    const forecastCol = header.findIndex((h) => new RegExp(`${year}.*forecast|forecast.*${year}`, "i").test(h));
    const actualCol = header.findIndex((h) => new RegExp(`${year}.*(current|actual)`, "i").test(h));
    // Any other year-bearing column is a prior-year actuals/valuation series.
    const priorCols = new Map<number, number>();
    header.forEach((h, c) => {
      if (c === forecastCol || c === actualCol) return;
      const m = h.match(/\b(20\d{2})\b/);
      if (m && Number(m[1]) !== year) priorCols.set(Number(m[1]), c);
    });

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const label = str(row[monthCol]);
      const idx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === label.toLowerCase());
      if (idx < 0) continue;
      priorCols.forEach((c, priorYear) => {
        monthly[idx].priorActuals[priorYear] = num(row[c]);
      });
      if (forecastCol >= 0) monthly[idx].forecast = num(row[forecastCol]);
      if (actualCol >= 0) monthly[idx].actual = num(row[actualCol]);
    }

    // Quarterly block: anchored on a literal "Quarter" cell.
    outer: for (let i = 0; i < rows.length; i++) {
      for (let j = 0; j < (rows[i] ?? []).length; j++) {
        if (str(rows[i][j]) !== "Quarter") continue;
        for (let k = i + 1; k < i + 7 && k < rows.length; k++) {
          const label = str(rows[k][j]);
          if (!/^Q\d/i.test(label)) continue;
          quarters.push({
            label,
            forecast: num(rows[k][j + 1]),
            actual: num(rows[k][j + 2]),
            delta: num(rows[k][j + 3]),
            pct: num(rows[k][j + 4]),
            theme: str(rows[k][j + 5]) || null,
          });
        }
        break outer;
      }
    }
  }

  return { year, monthly, quarters };
}

/** Fills missing monthly forecast values from a "<YYYY> Forecasting" sheet. */
export function fillForecastTargets(forecast: ForecastYear, rows: Row[]): void {
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map((c) => str(c));
    if (cells.some((c) => /^month$/i.test(c)) && cells.some((c) => c.includes(String(forecast.year)))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return;
  const header = rows[headerIdx].map((c) => str(c));
  const monthCol = header.findIndex((h) => /^month$/i.test(h));
  const targetCol = header.findIndex((h) => new RegExp(`${forecast.year}.*target`, "i").test(h));
  if (targetCol < 0) return;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const label = str(rows[i][monthCol]);
    const entry = forecast.monthly.find((m) => m.month.toLowerCase() === label.toLowerCase());
    if (entry && entry.forecast == null) entry.forecast = num(rows[i][targetCol]);
  }
}
