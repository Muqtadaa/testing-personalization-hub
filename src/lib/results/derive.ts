import type {
  ExperimentMonth,
  ExperimentType,
  ForecastYear,
  MonthlyProgramTotals,
  ProgramSummary,
  ResultsDataset,
} from "@/lib/results/types";
import { monthName, splitMonthKey } from "./format";

// Pure selectors over the normalized dataset. Pages and charts derive
// everything through these so the math stays unit-testable and consistent.

// ── Months / program totals ──

export function latestYearWithData(months: MonthlyProgramTotals[]): number | null {
  let latest: number | null = null;
  for (const m of months) {
    if (m.total != null && m.total !== 0) {
      const { year } = splitMonthKey(m.monthKey);
      if (latest == null || year > latest) latest = year;
    }
  }
  return latest ?? (months.length ? splitMonthKey(months[months.length - 1].monthKey).year : null);
}

export function monthsForYear(months: MonthlyProgramTotals[], year: number): MonthlyProgramTotals[] {
  return months.filter((m) => splitMonthKey(m.monthKey).year === year);
}

export function yearsWithData(months: MonthlyProgramTotals[]): number[] {
  return [...new Set(months.map((m) => splitMonthKey(m.monthKey).year))].sort((a, b) => a - b);
}

/** Months in `year` that actually have a reported total (> 0 or explicitly ≠ 0). */
export function reportedMonths(months: MonthlyProgramTotals[], year: number): MonthlyProgramTotals[] {
  return monthsForYear(months, year).filter((m) => m.total != null && m.total !== 0);
}

export interface YearTotals {
  total: number;
  optimizations: number;
  personalizations: number;
  recommendations: number;
  throughMonth: number; // last month number with data
}

export function ytdTotals(months: MonthlyProgramTotals[], year: number): YearTotals {
  const reported = reportedMonths(months, year);
  const sum = (pick: (m: MonthlyProgramTotals) => number | null) =>
    reported.reduce((acc, m) => acc + (pick(m) ?? 0), 0);
  return {
    total: sum((m) => m.total),
    optimizations: sum((m) => m.optimizations),
    personalizations: sum((m) => m.personalizations),
    recommendations: sum((m) => m.recommendations),
    throughMonth: reported.reduce((acc, m) => Math.max(acc, splitMonthKey(m.monthKey).month), 0),
  };
}

// ── Forecast pacing ──

export interface Pacing {
  actualYtd: number;
  forecastYtd: number;
  ratio: number | null; // actual / forecast
  throughMonth: number;
}

/** YTD actual vs forecast, summed over months that have reported actuals. */
export function forecastPacing(
  forecast: ForecastYear,
  months: MonthlyProgramTotals[],
): Pacing {
  const { throughMonth } = ytdTotals(months, forecast.year);
  let actualYtd = 0;
  let forecastYtd = 0;
  forecast.monthly.forEach((m, idx) => {
    if (idx + 1 > throughMonth) return;
    actualYtd += m.actual ?? 0;
    forecastYtd += m.forecast ?? 0;
  });
  return {
    actualYtd,
    forecastYtd,
    ratio: forecastYtd > 0 ? actualYtd / forecastYtd : null,
    throughMonth,
  };
}

/** Same-period prior-year comparison from the Summary sheet. */
export function yoySamePeriod(
  summary: ProgramSummary | null,
  year: number,
  throughMonth: number,
): { current: number; prior: number; ratio: number | null } | null {
  if (!summary || !summary.years.includes(year - 1)) return null;
  let current = 0;
  let prior = 0;
  for (let m = 1; m <= throughMonth; m++) {
    const row = summary.monthly[monthName(m, { long: true })];
    if (!row) continue;
    current += row[year] ?? 0;
    prior += row[year - 1] ?? 0;
  }
  if (prior === 0) return null;
  return { current, prior, ratio: (current - prior) / prior };
}

export function latestForecast(dataset: ResultsDataset): ForecastYear | null {
  return dataset.forecasts.length ? dataset.forecasts[dataset.forecasts.length - 1] : null;
}

/**
 * Yearly totals for the "year by year" strip. Prefers the workbook's Summary
 * sheet (the official "Growth Program Rev" reporting numbers — the monthly
 * program blocks disagree with it for some years, e.g. 2024), falling back to
 * summed monthly blocks. `partial` marks an in-progress year so the UI can
 * suppress misleading full-year comparisons.
 */
export function annualSeries(
  dataset: ResultsDataset,
): { year: number; total: number; partial: boolean }[] {
  const years = yearsWithData(dataset.months);
  return years.map((year) => {
    const { total: blocksTotal, throughMonth } = ytdTotals(dataset.months, year);
    let total = blocksTotal;
    if (dataset.summary?.years.includes(year)) {
      let sum = 0;
      let any = false;
      for (const row of Object.values(dataset.summary.monthly)) {
        const v = row[year];
        if (v != null) {
          sum += v;
          any = true;
        }
      }
      if (any) total = sum;
    }
    return { year, total, partial: throughMonth < 12 };
  });
}

// ── Experiments: filtering, grouping, leaderboards ──

export interface ExplorerFilters {
  from: string | null; // monthKey inclusive
  to: string | null;
  types: ExperimentType[]; // empty = all
  campaign: string | null;
  search: string;
}

export const emptyFilters: ExplorerFilters = {
  from: null,
  to: null,
  types: [],
  campaign: null,
  search: "",
};

export function filterExperiments(
  experiments: ExperimentMonth[],
  filters: ExplorerFilters,
): ExperimentMonth[] {
  const search = filters.search.trim().toLowerCase();
  return experiments.filter((e) => {
    if (filters.from && e.monthKey < filters.from) return false;
    if (filters.to && e.monthKey > filters.to) return false;
    if (filters.types.length && !filters.types.includes(e.type)) return false;
    if (filters.campaign && (e.campaign ?? "") !== filters.campaign) return false;
    if (search) {
      const haystack = `${e.displayName ?? ""} ${e.rawName} ${e.campaign ?? ""} ${e.experimentId ?? ""}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

/** An experiment grouped across the months it ran. */
export interface ExperimentGroup {
  key: string;
  experimentId: string | null;
  displayName: string;
  type: ExperimentType;
  campaign: string | null;
  startDate: string | null;
  endDate: string | null;
  months: ExperimentMonth[]; // sorted by monthKey
  firstMonthKey: string;
  lastMonthKey: string;
  totalUplift: number | null; // sum of monthly bestUplift
  totalUsers: number | null;
}

export function groupExperiments(experiments: ExperimentMonth[]): ExperimentGroup[] {
  const byKey = new Map<string, ExperimentMonth[]>();
  for (const e of experiments) {
    const list = byKey.get(e.key);
    if (list) list.push(e);
    else byKey.set(e.key, [e]);
  }
  const groups: ExperimentGroup[] = [];
  byKey.forEach((months, key) => {
    months.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const last = months[months.length - 1];
    const upliftMonths = months.filter((m) => m.bestUplift != null);
    const userMonths = months.filter((m) => m.totals.users != null);
    groups.push({
      key,
      experimentId: last.experimentId,
      displayName: last.displayName ?? last.rawName,
      type: last.type,
      campaign: last.campaign,
      startDate: months[0].startDate,
      endDate: last.endDate,
      months,
      firstMonthKey: months[0].monthKey,
      lastMonthKey: last.monthKey,
      totalUplift: upliftMonths.length
        ? upliftMonths.reduce((acc, m) => acc + (m.bestUplift ?? 0), 0)
        : null,
      totalUsers: userMonths.length
        ? userMonths.reduce((acc, m) => acc + (m.totals.users ?? 0), 0)
        : null,
    });
  });
  return groups.sort((a, b) => b.lastMonthKey.localeCompare(a.lastMonthKey));
}

/** Top/bottom experiment-months by uplift within the (already filtered) set. */
export function upliftLeaderboard(
  experiments: ExperimentMonth[],
  direction: "top" | "bottom",
  limit = 10,
): ExperimentMonth[] {
  const withUplift = experiments.filter((e) => e.bestUplift != null);
  withUplift.sort((a, b) =>
    direction === "top" ? b.bestUplift! - a.bestUplift! : a.bestUplift! - b.bestUplift!,
  );
  return withUplift.slice(0, limit);
}

// ── Chart series ──

export function typeMix(
  experiments: ExperimentMonth[],
): { type: ExperimentType; count: number; uplift: number }[] {
  const acc = new Map<ExperimentType, { count: number; uplift: number }>();
  for (const e of experiments) {
    const entry = acc.get(e.type) ?? { count: 0, uplift: 0 };
    entry.count += 1;
    entry.uplift += e.bestUplift ?? 0;
    acc.set(e.type, entry);
  }
  return [...acc.entries()].map(([type, v]) => ({ type, ...v })).sort((a, b) => b.count - a.count);
}

export function campaignRanking(
  experiments: ExperimentMonth[],
  limit = 8,
): { campaign: string; count: number; uplift: number }[] {
  const acc = new Map<string, { count: number; uplift: number }>();
  for (const e of experiments) {
    if (!e.campaign) continue;
    const entry = acc.get(e.campaign) ?? { count: 0, uplift: 0 };
    entry.count += 1;
    entry.uplift += e.bestUplift ?? 0;
    acc.set(e.campaign, entry);
  }
  return [...acc.entries()]
    .map(([campaign, v]) => ({ campaign, ...v }))
    .sort((a, b) => b.uplift - a.uplift)
    .slice(0, limit);
}

export function campaignOptions(experiments: ExperimentMonth[]): string[] {
  return [...new Set(experiments.map((e) => e.campaign).filter((c): c is string => !!c))].sort();
}
