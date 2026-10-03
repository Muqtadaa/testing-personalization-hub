import { randomUUID } from "node:crypto";
import { getSupabase } from "./client";
import {
  emptyIntakeFields,
  type IntakeRecord,
} from "@/lib/intake/types";

// Repository for intake drafts + submitted intakes. Uses Supabase `intakes`
// table when configured; otherwise an in-process Map (sufficient for local dev,
// where the Next dev server is a single long-lived process).

const TABLE = "intakes";
const mem = new Map<string, IntakeRecord>();

function nowIso() {
  return new Date().toISOString();
}

function rowToRecord(row: Record<string, unknown>): IntakeRecord {
  return {
    id: row.id as string,
    status: row.status as IntakeRecord["status"],
    phase: (row.phase as IntakeRecord["phase"]) ?? "core",
    mode: (row.mode as IntakeRecord["mode"]) ?? "create",
    improveGaps: (row.improve_gaps as IntakeRecord["improveGaps"]) ?? null,
    fields: (row.fields as IntakeRecord["fields"]) ?? emptyIntakeFields(),
    confidences: (row.confidences as IntakeRecord["confidences"]) ?? {},
    messages: (row.messages as IntakeRecord["messages"]) ?? [],
    brief: (row.brief as IntakeRecord["brief"]) ?? null,
    missingFields: (row.missing_fields as string[]) ?? [],
    unresolvedAssumptions: (row.unresolved_assumptions as string[]) ?? [],
    pendingQuestions: (row.pending_questions as IntakeRecord["pendingQuestions"]) ?? [],
    attachments: (row.attachments as IntakeRecord["attachments"]) ?? [],
    jiraIssueKey: (row.jira_issue_key as string) ?? null,
    jiraUrl: (row.jira_url as string) ?? null,
    dryRun: (row.dry_run as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function recordToRow(rec: IntakeRecord): Record<string, unknown> {
  return {
    id: rec.id,
    status: rec.status,
    phase: rec.phase,
    mode: rec.mode ?? "create",
    improve_gaps: rec.improveGaps ?? null,
    fields: rec.fields,
    confidences: rec.confidences,
    messages: rec.messages,
    brief: rec.brief,
    missing_fields: rec.missingFields,
    unresolved_assumptions: rec.unresolvedAssumptions,
    pending_questions: rec.pendingQuestions,
    attachments: rec.attachments,
    jira_issue_key: rec.jiraIssueKey,
    jira_url: rec.jiraUrl,
    dry_run: rec.dryRun,
    created_at: rec.createdAt,
    updated_at: rec.updatedAt,
  };
}

// Writes a row, retrying without columns that may not exist yet (graceful
// degradation when a migration hasn't been applied). Covers `pending_questions`,
// `attachments`, and `phase`.
const OPTIONAL_COLUMNS = ["pending_questions", "attachments", "phase", "mode", "improve_gaps"] as const;
async function writeRow(
  op: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>,
  row: Record<string, unknown>,
  context: string,
): Promise<void> {
  let { error } = await op(row);
  if (error && /pending_questions|attachments|phase|mode|improve_gaps|schema cache|column/i.test(error.message)) {
    const rest = { ...row };
    for (const c of OPTIONAL_COLUMNS) delete rest[c];
    ({ error } = await op(rest));
  }
  if (error) throw new Error(`${context} failed: ${error.message}`);
}

export async function createIntake(partial?: Partial<IntakeRecord>): Promise<IntakeRecord> {
  const rec: IntakeRecord = {
    id: randomUUID(),
    status: "draft",
    phase: "core",
    fields: emptyIntakeFields(),
    confidences: {},
    messages: [],
    brief: null,
    missingFields: [],
    unresolvedAssumptions: [],
    pendingQuestions: [],
    attachments: [],
    jiraIssueKey: null,
    jiraUrl: null,
    dryRun: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...partial,
  };
  const db = getSupabase();
  if (db) {
    await writeRow(async (row) => await db.from(TABLE).insert(row), recordToRow(rec), "createIntake");
  } else {
    mem.set(rec.id, rec);
  }
  return rec;
}

export async function getIntake(id: string): Promise<IntakeRecord | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`getIntake failed: ${error.message}`);
    return data ? rowToRecord(data) : null;
  }
  return mem.get(id) ?? null;
}

/** Lists draft intakes for a given submitter email, newest first. */
export async function listDraftsByEmail(email: string): Promise<IntakeRecord[]> {
  const normalized = email.trim().toLowerCase();
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from(TABLE)
      .select("*")
      .eq("status", "draft")
      .filter("fields->>submitterEmail", "eq", normalized)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(`listDraftsByEmail failed: ${error.message}`);
    return (data ?? []).map(rowToRecord);
  }
  return Array.from(mem.values())
    .filter((r) => r.status === "draft" && (r.fields.submitterEmail ?? "").toLowerCase() === normalized)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** Finds the newest in-progress "improve" draft for a Jira issue, if any. A
 *  draft with a non-null jiraIssueKey is necessarily an improve draft (fresh
 *  intakes only get a key once submitted), so we can match on the key + status. */
export async function getImproveDraft(issueKey: string): Promise<IntakeRecord | null> {
  const db = getSupabase();
  if (db) {
    const { data, error } = await db
      .from(TABLE)
      .select("*")
      .eq("status", "draft")
      .eq("jira_issue_key", issueKey)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(`getImproveDraft failed: ${error.message}`);
    const row = (data ?? [])[0];
    return row ? rowToRecord(row) : null;
  }
  return (
    Array.from(mem.values())
      .filter((r) => r.status === "draft" && r.jiraIssueKey === issueKey)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ?? null
  );
}

export async function saveIntake(rec: IntakeRecord): Promise<IntakeRecord> {
  rec.updatedAt = nowIso();
  const db = getSupabase();
  if (db) {
    await writeRow(async (row) => await db.from(TABLE).upsert(row), recordToRow(rec), "saveIntake");
  } else {
    mem.set(rec.id, rec);
  }
  return rec;
}

/**
 * Deletes a DRAFT intake. Scoped to status="draft" so a submitted intake can
 * never be removed, and (when provided) to the owning submitter email so a user
 * can only delete their own drafts. Returns true when a row was deleted.
 */
export async function deleteIntake(id: string, opts: { email?: string } = {}): Promise<boolean> {
  const email = opts.email?.trim().toLowerCase();
  const db = getSupabase();
  if (db) {
    let q = db.from(TABLE).delete().eq("id", id).eq("status", "draft");
    if (email) q = q.filter("fields->>submitterEmail", "eq", email);
    const { data, error } = await q.select("id");
    if (error) throw new Error(`deleteIntake failed: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }
  const rec = mem.get(id);
  if (
    rec &&
    rec.status === "draft" &&
    (!email || (rec.fields.submitterEmail ?? "").toLowerCase() === email)
  ) {
    mem.delete(id);
    return true;
  }
  return false;
}
