import { JIRA_FIELDS } from "@/lib/intake/config/jira-env";
import type { AppConfig } from "@/lib/intake/config/schema";
import { briefToAdf } from "@/lib/intake/brief/adf";
import { computeRouting } from "@/lib/intake/routing";
import { scoreRice } from "@/lib/intake/rice/score";
import { normalizeFutureDate } from "@/lib/intake/text";
import type { GeneratedBrief, IntakeRecord } from "@/lib/intake/types";
import type { ReporterResolution } from "./reporter";

// Builds the Jira `fields` payload from an intake record + config + brief +
// reporter resolution. Pure & side-effect free so dry-run can preview exactly
// what a real submit would send.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface MappedPayload {
  fields: Record<string, unknown>;
  /** Human-readable resolution for the dry-run / confirmation screen. */
  summary: { label: string; jiraFieldId: string; value: string }[];
  labels: string[];
}

function fieldValue(record: IntakeRecord, key: string): string {
  const v = (record.fields as unknown as Record<string, unknown>)[key];
  return v == null ? "" : `${v}`.trim();
}

export function buildJiraPayload(
  record: IntakeRecord,
  brief: GeneratedBrief,
  reporter: ReporterResolution,
  config: AppConfig,
): MappedPayload {
  const jira = config.jira;
  const fields: Record<string, unknown> = {
    project: { id: jira.projectId },
    issuetype: { id: jira.issueTypeId },
  };
  const summary: MappedPayload["summary"] = [];
  const add = (label: string, jiraFieldId: string, value: string) =>
    summary.push({ label, jiraFieldId, value });

  // Summary / title
  const title = brief.title || fieldValue(record, "briefTitle") || "Untitled intake";
  fields.summary = title;
  add("Summary", "summary", title);

  // Reporter
  if (reporter.accountId) {
    fields.reporter = { accountId: reporter.accountId };
    add(
      "Reporter",
      "reporter",
      reporter.matchedSubmitter ? `submitter (${reporter.accountId})` : `service account (${reporter.accountId})`,
    );
  }

  // Description (ADF). Preamble carries submitter identity when unmatched + assumptions.
  const preamble: string[] = [];
  if (reporter.preambleNote) preamble.push(reporter.preambleNote);
  if (record.unresolvedAssumptions.length) {
    preamble.push(`Open assumptions to confirm in triage: ${record.unresolvedAssumptions.join("; ")}`);
  }
  if (record.attachments.length) {
    const names = record.attachments.map((a) => a.filename).join(", ");
    preamble.push(`Attached for context: ${names}`);
  }
  fields.description = briefToAdf(brief, preamble);
  add("Description", "description", "structured brief (ADF)");

  // Attachments (uploaded after issue creation; surfaced here for the dry-run).
  if (record.attachments.length) {
    const screenshots = record.attachments.filter((a) => a.kind === "screenshot").length;
    const mockups = record.attachments.filter((a) => a.kind === "mockup").length;
    const documents = record.attachments.filter((a) => a.kind === "document").length;
    add(
      "Attachments",
      "attachments",
      `${record.attachments.length} file(s): ${screenshots} screenshot(s), ${mockups} mockup(s), ${documents} document(s)`,
    );
  }

  // Configured select mappings (request type, LOB, journey).
  for (const m of config.fieldMappings) {
    if (m.kind !== "select" || !m.valueMap) continue;
    if (m.intakeField.startsWith("rice.")) continue; // handled below
    const v = fieldValue(record, m.intakeField);
    if (!v) continue;
    const optionId = m.valueMap[v];
    if (optionId) {
      fields[m.jiraFieldId] = { id: optionId };
      add(m.note ?? m.intakeField, m.jiraFieldId, `${v} (option ${optionId})`);
    }
  }

  // Due date from results-needed date (rolled forward if it's a past date).
  const due = normalizeFutureDate(fieldValue(record, "resultsNeededBy")) ?? "";
  if (ISO_DATE.test(due)) {
    fields.duedate = due;
    add("Due date", "duedate", due);
  }

  // RICE H/M/L selects.
  const { buckets } = scoreRice(record.fields.rice, config.rice);
  const riceMap: Record<"reach" | "impact" | "effort", string> = {
    reach: JIRA_FIELDS.riceReach,
    impact: JIRA_FIELDS.riceImpact,
    effort: JIRA_FIELDS.riceEffort,
  };
  (["reach", "impact", "effort"] as const).forEach((dim) => {
    const bucket = buckets[dim];
    if (!bucket) return;
    const optionId = config.rice.bucketOptionIds[dim][bucket];
    if (optionId) {
      fields[riceMap[dim]] = { id: optionId };
      add(`RICE ${dim}`, riceMap[dim], `${bucket} (option ${optionId})`);
    }
  });

  // Derived: Category from request type, Journey Platform from line of business (optional).
  const reqType = fieldValue(record, "requestType");
  const categoryOption = config.derived.categoryByRequestType[reqType];
  if (categoryOption) {
    fields[JIRA_FIELDS.category] = { id: categoryOption };
    add("Category (derived)", JIRA_FIELDS.category, `option ${categoryOption}`);
  }
  const lob = fieldValue(record, "lineOfBusiness");
  const jpOption = config.derived.journeyPlatformByLob[lob];
  if (jpOption) {
    fields[JIRA_FIELDS.journeyPlatform] = { id: jpOption };
    add("Journey platform (derived)", JIRA_FIELDS.journeyPlatform, `option ${jpOption}`);
  }

  // Labels: base + routing + platform + needs-review.
  const routing = computeRouting(record.fields, config);
  const labels = new Set<string>(config.labels.base);
  routing.labels.forEach((l) => labels.add(sanitizeLabel(l)));
  const platform = fieldValue(record, "endUserPlatform");
  if (platform && platform.toLowerCase() !== "unknown") {
    labels.add(sanitizeLabel(`${config.labels.platformPrefix}${platform}`));
  }
  if (record.unresolvedAssumptions.length) labels.add(config.labels.needsManualReview);
  const labelArr = [...labels];
  fields.labels = labelArr;
  add("Labels", "labels", labelArr.join(", "));

  return { fields, summary, labels: labelArr };
}

function sanitizeLabel(raw: string): string {
  // Jira labels cannot contain spaces.
  return raw.trim().replace(/\s+/g, "-");
}

// Fields that may only be set on CREATE, never on a PUT edit (Jira 400s on them).
const CREATE_ONLY_FIELDS = ["project", "issuetype", "reporter"];

/**
 * UPDATE-safe payload for editing an existing issue (the "improve the brief"
 * flow). Reuses the exact same per-field mapping as create, then strips the
 * creation-only fields and `labels` (we never clobber labels an existing ticket
 * already carries). The reporter is intentionally omitted: an edit must not
 * reassign who reported the ticket. Confidence is never written — there is no
 * Jira custom field for it (only Reach/Impact/Effort selects exist).
 */
export function buildJiraUpdatePayload(
  record: IntakeRecord,
  brief: GeneratedBrief,
  config: AppConfig,
): MappedPayload {
  // A no-op reporter resolution: no reporter field, no submitter preamble note.
  const noReporter: ReporterResolution = {
    accountId: null,
    matchedSubmitter: true,
    preambleNote: null,
  };
  const full = buildJiraPayload(record, brief, noReporter, config);
  const fields: Record<string, unknown> = { ...full.fields };
  for (const k of CREATE_ONLY_FIELDS) delete fields[k];
  delete fields.labels;
  const skip = new Set([...CREATE_ONLY_FIELDS, "labels"]);
  const summary = full.summary.filter((s) => !skip.has(s.jiraFieldId));
  return { fields, summary, labels: full.labels };
}
