// Normalized data model for the Results section. This is the contract between
// data producers (today: Excel workbook uploads; later: BigQuery/Snowflake
// ingestion) and everything downstream (API, pages, charts). Producers write a
// complete ResultsDataset; consumers never see Excel shapes.

export type ExperimentType = "optimization" | "personalization" | "other";
export type ExperimentTag = "AB" | "W-AB" | "PZ" | "W-PZ" | null;

export interface HoldbackRow {
  users: number | null;
  estRevenue: number | null;
  actualRevenue: number | null;
  normalizedRevenue: number | null;
  uplift: number | null;
}

export interface VariationResult {
  /** Label as it appears in the workbook, e.g. "Original", "Variation #1". */
  label: string;
  /** Friendlier label from the Source Data workbook, when matched. */
  enrichedLabel: string | null;
  isControl: boolean;
  users: number | null;
  estRevenue: number | null;
  actualRevenue: number | null;
  normalizedRevenue: number | null;
  /**
   * "Variation Revenue Difference" — the estimated incremental uplift vs
   * control, read directly from the workbook (never recomputed). Headline
   * metric for the whole section.
   */
  uplift: number | null;
  /** Holdback split (2025+ sheets): included = holdback users, excluded = exposed. */
  holdback: { included: HoldbackRow; excluded: HoldbackRow } | null;
}

/** One experiment's results within a single monthly sheet. */
export interface ExperimentMonth {
  /** Stable grouping/routing key: experimentId, or "x-<hash>" when absent. */
  key: string;
  experimentId: string | null;
  rawName: string;
  /** Clean name from Source Data enrichment; fall back to rawName sans id. */
  displayName: string | null;
  /** "2026-01" */
  monthKey: string;
  type: ExperimentType;
  tag: ExperimentTag;
  campaign: string | null;
  startDate: string | null; // ISO date from Source Data
  endDate: string | null;
  webOrderImpacted: string | null;
  totals: {
    users: number | null;
    estRevenue: number | null;
    actualRevenue: number | null;
  };
  variations: VariationResult[];
  /** Max variation uplift this month (headline). */
  bestUplift: number | null;
}

/** Labeled totals block at the bottom of each monthly sheet. */
export interface MonthlyProgramTotals {
  monthKey: string;
  netRevenueUplift: number | null;
  optimizations: number | null;
  personalizations: number | null;
  recommendations: number | null;
  /** Monthly program outcome; matches the Summary sheet's value. */
  total: number | null;
}

export interface ProgramSummary {
  years: number[];
  /** "January" -> { 2023: n, ... } */
  monthly: Record<string, Record<number, number | null>>;
  /** "Q1 Total" -> { 2023: n, ... } */
  quarterly: Record<string, Record<number, number | null>>;
  annual: Record<number, number | null>;
  yoy: Record<number, number | null>;
}

export interface ForecastMonth {
  month: string; // "January"
  /** Prior-year actuals keyed by year, e.g. { 2024: n, 2025: n }. */
  priorActuals: Record<number, number | null>;
  forecast: number | null;
  actual: number | null;
}

export interface ForecastQuarter {
  label: string; // "Q1"
  forecast: number | null;
  actual: number | null;
  delta: number | null;
  pct: number | null;
  theme: string | null;
}

export interface ForecastYear {
  year: number;
  monthly: ForecastMonth[];
  quarters: ForecastQuarter[];
}

export interface SourceVariation {
  label: string;
  trafficSplit: number | null;
}

export interface SourceExperiment {
  id: string;
  expName: string;
  type: string;
  campaign: string | null;
  startDate: string | null;
  endDate: string | null;
  webOrderImpacted: string | null;
  variations: SourceVariation[];
}

export interface ParseWarning {
  sheet: string | null;
  message: string;
}

export interface ResultsDataset {
  schemaVersion: 1;
  source: { kind: "excel-upload" | "warehouse-api"; generatedAt: string };
  months: MonthlyProgramTotals[]; // sorted by monthKey
  experiments: ExperimentMonth[]; // sorted by monthKey, then rawName
  summary: ProgramSummary | null;
  forecasts: ForecastYear[];
  /** Keyed by experimentId; empty when no Source Data workbook uploaded. */
  sourceCatalog: Record<string, SourceExperiment>;
  warnings: ParseWarning[];
}

export interface ParseStats {
  monthsFound: string[];
  experimentCount: number;
  variationCount: number;
  forecastYears: number[];
  sourceExperimentCount: number;
  warningCount: number;
}

// ── Dataset versioning (Supabase `results_dataset_versions`) ──

export interface ResultsVersionMeta {
  id: string;
  createdAt: string;
  uploadedByEmail: string | null;
  uploadedByName: string | null;
  workbookFilename: string;
  workbookBlobPath: string | null;
  sourceFilename: string | null;
  sourceBlobPath: string | null;
  isActive: boolean;
  parseStats: ParseStats;
  notes: string | null;
}

export interface ResultsVersionRecord extends ResultsVersionMeta {
  dataset: ResultsDataset;
}
