// Shared helpers for the workbook parsers. These operate on the row arrays
// produced by `sheet_to_json(ws, { header: 1, defval: null })`.

export type Cell = string | number | boolean | Date | null;
export type Row = Cell[];

/** Finite number or null. */
export function num(v: Cell): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

export function str(v: Cell): string {
  return v == null ? "" : String(v).trim();
}

/**
 * Resolves a monthly sheet name like "26 Jan" or "24 Sept" (3–4 letter month
 * tokens — the old portal's 3-letter-only regex silently dropped "24 Sept").
 * Returns { year, month } or null for non-monthly sheets.
 */
const MONTH_INDEX: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function parseMonthSheetName(name: string): { year: number; month: number } | null {
  const m = name.trim().match(/^(\d{2})\s+([A-Z][a-z]{2,3})$/);
  if (!m) return null;
  const month = MONTH_INDEX[m[2].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return { year: 2000 + parseInt(m[1], 10), month };
}

export function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Case-insensitive header lookup with aliases. Returns the column index of the
 * first alias that matches, or -1.
 */
export function findColumn(header: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const i = header.findIndex((h) => h.toLowerCase() === alias.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

/** Stable synthetic key for experiments without an Optimizely id (FNV-1a). */
export function syntheticKey(rawName: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < rawName.length; i++) {
    hash ^= rawName.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `x-${hash.toString(36)}`;
}

export function toIsoDate(v: Cell): string | null {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
