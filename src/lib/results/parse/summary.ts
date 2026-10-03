import type { ProgramSummary } from "@/lib/results/types";
import { num, str, type Row } from "./shared";

// "Summary" sheet: a year-column matrix ("Growth Program Rev" title row, then a
// header row of 4-digit years, then month rows, "Qn Total" rows, and optional
// Annual / YoY rows). Years are detected dynamically so 2027+ needs no change.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isYear(v: unknown): boolean {
  const n = Number(v);
  return Number.isInteger(n) && n >= 2020 && n <= 2099;
}

export function parseSummarySheet(rows: Row[]): ProgramSummary | null {
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].filter((c) => isYear(c)).length >= 2) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return null;

  const yearCols = new Map<number, number>();
  rows[headerIdx].forEach((cell, c) => {
    if (isYear(cell)) yearCols.set(Number(cell), c);
  });

  const summary: ProgramSummary = {
    years: [...yearCols.keys()].sort((a, b) => a - b),
    monthly: {},
    quarterly: {},
    annual: {},
    yoy: {},
  };

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const label = str(row[0]);
    if (!label) continue;
    const values: Record<number, number | null> = {};
    yearCols.forEach((c, year) => {
      values[year] = num(row[c]);
    });
    const lower = label.toLowerCase();
    if (MONTH_NAMES.some((m) => m.toLowerCase() === lower)) {
      summary.monthly[label] = values;
    } else if (/^q\d\s*total/i.test(label)) {
      summary.quarterly[label.replace(/\s+/g, " ")] = values;
    } else if (/annual/i.test(label)) {
      summary.annual = values;
    } else if (/yoy|growth/i.test(label)) {
      summary.yoy = values;
    }
  }
  return summary;
}
