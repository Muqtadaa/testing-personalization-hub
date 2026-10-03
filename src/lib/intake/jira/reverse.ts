import type { AppConfig } from "@/lib/intake/config/schema";
import { adfToText } from "@/lib/roadmap/adf-text";
import type { TicketReview } from "@/lib/roadmap/review/types";
import { emptyIntakeFields, type IntakeFields } from "@/lib/intake/types";
import { JIRA_FIELDS } from "@/lib/intake/config/jira-env";
import { getIssue, type JiraCreds, type JiraIssue } from "./client";

// Reverse-maps an existing Jira ticket into seed values for an "improve the
// brief" intake conversation. This is intentionally lossy: the description is
// one-way (brief -> ADF) today, so we seed CONTEXT (title + flattened
// description + native select labels) rather than reconstructing authoritative
// structured fields. The conversation confirms specifics; the gap list
// (improveGaps) drives which fields it actually pursues.

const DESC_MAX = 6000;

/** Resolve the Jira field IDs we read for the selects, from config. */
function fieldIds(config: AppConfig) {
  const byIntake: Record<string, string> = {};
  for (const m of config.fieldMappings) byIntake[m.intakeField] = m.jiraFieldId;
  return {
    lob: byIntake["lineOfBusiness"] ?? JIRA_FIELDS.lineOfBusiness,
    journey: byIntake["journeySegment"] ?? JIRA_FIELDS.journey,
    requestType: byIntake["requestType"] ?? JIRA_FIELDS.requestType,
  };
}

/** Read a Jira single-select option's display value. */
function selectValue(field: unknown): string | null {
  if (field && typeof field === "object" && "value" in field) {
    const v = (field as { value?: unknown }).value;
    return typeof v === "string" ? v : null;
  }
  return null;
}

/** Set a classification field only when the ticket's value is one of the allowed
 *  taxonomy labels — otherwise leave it null so the conversation confirms it. */
function taxonomyValue(raw: string | null, allowed: string[]): string | null {
  if (!raw) return null;
  return allowed.includes(raw) ? raw : null;
}

export const IMPROVE_FETCH_FIELDS = (config: AppConfig): string[] => {
  const ids = fieldIds(config);
  return ["summary", "description", "updated", ids.lob, ids.journey, ids.requestType];
};

export async function fetchIssueForImprove(
  creds: JiraCreds,
  key: string,
  config: AppConfig,
): Promise<JiraIssue> {
  return getIssue(creds, key, IMPROVE_FETCH_FIELDS(config));
}

export interface SeedFromIssue {
  fields: IntakeFields;
  /** Jira `updated` at seed time (so a stale seed can be detected). */
  updated: string | null;
  /** Raw flattened description, kept verbatim for the conversation context. */
  descriptionText: string;
}

/** Build the seed field values from a fetched issue. Pure — the caller persists. */
export function issueToSeed(issue: JiraIssue, config: AppConfig): SeedFromIssue {
  const ids = fieldIds(config);
  const f = issue.fields ?? {};
  const fields = emptyIntakeFields();

  const summary = (f.summary as string) ?? "";
  if (summary.trim()) fields.briefTitle = summary.trim();

  const descRaw = adfToText(f.description).replace(/\n{3,}/g, "\n\n").trim();
  const descriptionText = descRaw.length > DESC_MAX ? `${descRaw.slice(0, DESC_MAX)}…` : descRaw;
  // Seed the existing brief as business context so the conversation and the
  // regenerated brief retain what the ticket already says.
  if (descriptionText) fields.businessContext = descriptionText;

  const t = config.taxonomy;
  fields.lineOfBusiness = taxonomyValue(selectValue(f[ids.lob]), t.lineOfBusiness);
  fields.journeySegment = taxonomyValue(selectValue(f[ids.journey]), t.journeySegment);
  fields.requestType = taxonomyValue(selectValue(f[ids.requestType]), t.requestType);

  return { fields, updated: (f.updated as string) ?? null, descriptionText };
}

/** Convenience: fetch + reverse-map in one call. */
export async function buildSeedForImprove(
  creds: JiraCreds,
  key: string,
  config: AppConfig,
): Promise<SeedFromIssue> {
  const issue = await fetchIssueForImprove(creds, key, config);
  return issueToSeed(issue, config);
}

export type { TicketReview };
