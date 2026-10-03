// Number/date formatting for the Results section. The hub's first currency
// formatters — revenue figures are USD throughout.

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$1,234,568" — whole-dollar display for tables and tooltips. */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "—";
  return currency.format(value);
}

/** "$1,234,567.89" — exact display where cents matter (parse report checks). */
export function formatCurrencyExact(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "—";
  return currencyExact.format(value);
}

/** "$2.4M" / "$481K" / "$312" — compact display for KPIs and chart axes. */
export function formatCompactCurrency(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** "+12.4%" / "-3.1%" (ratio in, e.g. 0.124 → "+12.4%"). */
export function formatPercent(ratio: number | null | undefined, opts: { signed?: boolean } = {}): string {
  if (ratio == null || !isFinite(ratio)) return "—";
  const pct = (ratio * 100).toFixed(1);
  const signed = opts.signed ?? true;
  return `${signed && ratio > 0 ? "+" : ""}${pct}%`;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-01" → "Jan 2026" (or "January 2026" with { long: true }). */
export function formatMonthKey(monthKey: string, opts: { long?: boolean } = {}): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return monthKey;
  return `${(opts.long ? MONTH_LONG : MONTH_SHORT)[month - 1]} ${year}`;
}

/** "2026-01" → { year: 2026, month: 1 }. */
export function splitMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

export function monthName(month: number, opts: { long?: boolean } = {}): string {
  return (opts.long ? MONTH_LONG : MONTH_SHORT)[month - 1] ?? String(month);
}

/** "2026-01-25" → "Jan 25, 2026". */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTH_SHORT[m - 1]} ${d}, ${y}`;
}
