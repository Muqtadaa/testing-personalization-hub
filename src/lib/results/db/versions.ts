import { randomUUID } from "node:crypto";
import { getSupabase } from "@/lib/intake/db/client";
import type {
  ParseStats,
  ResultsDataset,
  ResultsVersionMeta,
  ResultsVersionRecord,
} from "@/lib/results/types";

// Repository for uploaded results dataset versions. One row per upload; exactly
// one row is active at a time (enforced by a partial unique index — see README).
// Uses the Supabase `results_dataset_versions` table when configured; otherwise
// an in-process Map (sufficient for local dev, single long-lived process).
//
// The `dataset` JSONB column is megabytes — list/meta queries must never select
// it. Only getActiveDataset/getVersionDataset do.

const TABLE = "results_dataset_versions";
const META_COLUMNS =
  "id, created_at, uploaded_by_email, uploaded_by_name, workbook_filename, workbook_blob_path, source_filename, source_blob_path, is_active, parse_stats, notes";

const mem = new Map<string, ResultsVersionRecord>();

// SNAPSHOT MODE: when Supabase is not configured (the public personal deploy),
// seed the in-memory store with a frozen export so the Results section renders
// the last live dataset instead of an empty state. Harmless when Supabase IS
// configured — every read path goes to the DB and ignores `mem`.
import resultsSnapshot from "@/data/snapshot/results.json";

(() => {
  const snap = resultsSnapshot as unknown as {
    meta: ResultsVersionMeta;
    dataset: ResultsDataset;
  };
  if (snap?.meta?.id && !mem.has(snap.meta.id)) {
    mem.set(snap.meta.id, { ...snap.meta, isActive: true, dataset: snap.dataset });
  }
})();

function rowToMeta(row: Record<string, unknown>): ResultsVersionMeta {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    uploadedByEmail: (row.uploaded_by_email as string) ?? null,
    uploadedByName: (row.uploaded_by_name as string) ?? null,
    workbookFilename: row.workbook_filename as string,
    workbookBlobPath: (row.workbook_blob_path as string) ?? null,
    sourceFilename: (row.source_filename as string) ?? null,
    sourceBlobPath: (row.source_blob_path as string) ?? null,
    isActive: (row.is_active as boolean) ?? false,
    parseStats: (row.parse_stats as ParseStats) ?? {
      monthsFound: [],
      experimentCount: 0,
      variationCount: 0,
      forecastYears: [],
      sourceExperimentCount: 0,
      warningCount: 0,
    },
    notes: (row.notes as string) ?? null,
  };
}

// True on the public snapshot deploy (no Supabase) — the Results data is frozen
// and the mutation routes (upload / activate / delete) refuse writes so a visitor
// can't replace the bundled dataset in the shared in-memory store.
export function resultsReadOnly(): boolean {
  return !getSupabase();
}

export interface CreateVersionInput {
  dataset: ResultsDataset;
  parseStats: ParseStats;
  workbookFilename: string;
  workbookBlobPath: string | null;
  sourceFilename: string | null;
  sourceBlobPath: string | null;
  uploadedByEmail: string | null;
  uploadedByName: string | null;
  notes?: string | null;
}

/** Inserts a new version and makes it the active one. */
export async function createVersion(input: CreateVersionInput): Promise<ResultsVersionMeta> {
  const record: ResultsVersionRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    uploadedByEmail: input.uploadedByEmail,
    uploadedByName: input.uploadedByName,
    workbookFilename: input.workbookFilename,
    workbookBlobPath: input.workbookBlobPath,
    sourceFilename: input.sourceFilename,
    sourceBlobPath: input.sourceBlobPath,
    isActive: false,
    parseStats: input.parseStats,
    notes: input.notes ?? null,
    dataset: input.dataset,
  };
  const db = getSupabase();
  if (db) {
    const { error } = await db.from(TABLE).insert({
      id: record.id,
      created_at: record.createdAt,
      uploaded_by_email: record.uploadedByEmail,
      uploaded_by_name: record.uploadedByName,
      workbook_filename: record.workbookFilename,
      workbook_blob_path: record.workbookBlobPath,
      source_filename: record.sourceFilename,
      source_blob_path: record.sourceBlobPath,
      is_active: false,
      parse_stats: record.parseStats,
      notes: record.notes,
      dataset: record.dataset,
    });
    if (error) throw new Error(`createVersion failed: ${error.message}`);
  } else {
    mem.set(record.id, record);
  }
  await activateVersion(record.id);
  record.isActive = true;
  const { dataset: _dataset, ...meta } = record;
  return meta;
}

export async function listVersions(): Promise<ResultsVersionMeta[]> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from(TABLE)
      .select(META_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`listVersions failed: ${error.message}`);
    return (data ?? []).map((row) => rowToMeta(row as Record<string, unknown>));
  }
  return Array.from(mem.values())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(({ dataset: _dataset, ...meta }) => meta);
}

export async function getVersionMeta(id: string): Promise<ResultsVersionMeta | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from(TABLE).select(META_COLUMNS).eq("id", id).maybeSingle();
    if (error) throw new Error(`getVersionMeta failed: ${error.message}`);
    return data ? rowToMeta(data as Record<string, unknown>) : null;
  }
  const rec = mem.get(id);
  if (!rec) return null;
  const { dataset: _dataset, ...meta } = rec;
  return meta;
}

export async function getVersionDataset(id: string): Promise<ResultsDataset | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from(TABLE).select("dataset").eq("id", id).maybeSingle();
    if (error) throw new Error(`getVersionDataset failed: ${error.message}`);
    return (data?.dataset as ResultsDataset) ?? null;
  }
  return mem.get(id)?.dataset ?? null;
}

export async function getActiveDataset(): Promise<{ meta: ResultsVersionMeta; dataset: ResultsDataset } | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from(TABLE)
      .select(`${META_COLUMNS}, dataset`)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(`getActiveDataset failed: ${error.message}`);
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return { meta: rowToMeta(row), dataset: row.dataset as ResultsDataset };
  }
  const rec = Array.from(mem.values()).find((r) => r.isActive);
  if (!rec) return null;
  const { dataset, ...meta } = rec;
  return { meta, dataset };
}

/**
 * Makes `id` the single active version (activating an older version is the
 * rollback path). Clear-then-set; on a unique-violation race, retries once.
 */
export async function activateVersion(id: string): Promise<ResultsVersionMeta | null> {
  const db = getSupabase();
  if (db) {
    const attempt = async (): Promise<{ message: string } | null> => {
      const cleared = await db.from(TABLE).update({ is_active: false }).eq("is_active", true);
      if (cleared.error) return cleared.error;
      const set = await db.from(TABLE).update({ is_active: true }).eq("id", id);
      return set.error;
    };
    let error = await attempt();
    if (error && /unique|duplicate/i.test(error.message)) error = await attempt();
    if (error) throw new Error(`activateVersion failed: ${error.message}`);
    return getVersionMeta(id);
  }
  const rec = mem.get(id);
  if (!rec) return null;
  for (const other of mem.values()) other.isActive = false;
  rec.isActive = true;
  const { dataset: _dataset, ...meta } = rec;
  return meta;
}

/** Deletes a NON-ACTIVE version. Returns its meta (for blob cleanup) or null. */
export async function deleteVersion(id: string): Promise<ResultsVersionMeta | null> {
  const db = getSupabase();
  if (db) {
    const meta = await getVersionMeta(id);
    if (!meta || meta.isActive) return null;
    const { error } = await db.from(TABLE).delete().eq("id", id).eq("is_active", false);
    if (error) throw new Error(`deleteVersion failed: ${error.message}`);
    return meta;
  }
  const rec = mem.get(id);
  if (!rec || rec.isActive) return null;
  mem.delete(id);
  const { dataset: _dataset, ...meta } = rec;
  return meta;
}
