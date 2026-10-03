import { getConfig } from "@/lib/intake/config/service";
import { saveIntake } from "@/lib/intake/db/intakes";
import { generateImprovedBrief } from "@/lib/intake/brief/generate";
import { invalidateReview } from "@/lib/roadmap/review/cache";
import { adfToText } from "@/lib/roadmap/adf-text";
import type { GeneratedBrief, IntakeRecord } from "@/lib/intake/types";
import { getIssue, getJiraCreds, hasJiraCreds, updateIssue } from "./client";
import { buildJiraUpdatePayload, type MappedPayload } from "./mapping";

const ORIGINAL_DESC_MAX = 12000;

/** The ticket's current description (authoritative base for the merge). Read
 *  fresh from Jira when possible; otherwise the seeded businessContext, which
 *  holds the original description for records seeded by the improve flow. */
async function loadOriginalDescription(record: IntakeRecord): Promise<string> {
  if (record.jiraIssueKey && hasJiraCreds()) {
    try {
      const issue = await getIssue(getJiraCreds(), record.jiraIssueKey, ["description"]);
      const text = adfToText(issue.fields?.description).replace(/\n{3,}/g, "\n\n").trim();
      if (text) return text.length > ORIGINAL_DESC_MAX ? `${text.slice(0, ORIGINAL_DESC_MAX)}…` : text;
    } catch (err) {
      console.error("[update] could not read original description:", (err as Error).message);
    }
  }
  return (record.fields.businessContext ?? "").trim();
}

// Orchestrates updating an EXISTING Jira ticket from an improved intake record
// (the "improve the brief" flow). Mirrors the dry-run / creds gating of
// submit.ts. Dry-run (default) returns the exact payload without writing; real
// mode PUTs the UPDATE-safe fields. It NEVER creates an issue, NEVER transitions
// status, and NEVER reassigns the reporter — it only enriches the ticket.

export interface UpdateResult {
  dryRun: boolean;
  brief: GeneratedBrief;
  payloadSummary: MappedPayload["summary"];
  fields: Record<string, unknown>;
  issueKey: string;
  issueUrl: string;
  updated?: boolean;
  warnings: string[];
}

function isDryRunDefault(): boolean {
  // Default to dry-run unless explicitly disabled (same contract as submit).
  return process.env.JIRA_DRY_RUN !== "false";
}

export async function updateIntakeIssue(
  record: IntakeRecord,
  opts: { dryRunOverride?: boolean } = {},
): Promise<UpdateResult> {
  const config = await getConfig();
  const warnings: string[] = [];
  const issueKey = record.jiraIssueKey;
  if (!issueKey) {
    throw new Error("updateIntakeIssue requires record.jiraIssueKey to be set.");
  }
  const issueUrl = `${config.jira.baseUrl}/browse/${issueKey}`;

  const existingDescription = await loadOriginalDescription(record);
  const brief = await generateImprovedBrief(record, existingDescription);
  const mapped = buildJiraUpdatePayload(record, brief, config);
  // Confidence has no Jira field — make that explicit on the preview.
  if (record.fields.rice.confidence != null) {
    warnings.push("RICE Confidence is kept in the brief only; Jira has no Confidence field.");
  }

  const credsAvailable = hasJiraCreds();
  const dryRun = opts.dryRunOverride ?? (isDryRunDefault() || !credsAvailable);
  if (!credsAvailable && opts.dryRunOverride === false) {
    warnings.push("Jira credentials are not configured; forced dry-run.");
  }

  record.brief = brief;
  if (dryRun) {
    record.dryRun = true;
    await saveIntake(record);
    return {
      dryRun: true,
      brief,
      payloadSummary: mapped.summary,
      fields: mapped.fields,
      issueKey,
      issueUrl,
      warnings,
    };
  }

  // Real update.
  const creds = getJiraCreds();
  await updateIssue(creds, issueKey, mapped.fields);

  record.status = "submitted";
  record.jiraUrl = issueUrl;
  record.dryRun = false;
  await saveIntake(record);

  // Drop the cached review so the next roadmap sync recomputes (now improved).
  try {
    await invalidateReview(issueKey);
  } catch (err) {
    warnings.push(`Updated ${issueKey} but could not invalidate its cached review: ${(err as Error).message}`);
  }

  return {
    dryRun: false,
    brief,
    payloadSummary: mapped.summary,
    fields: mapped.fields,
    issueKey,
    issueUrl,
    updated: true,
    warnings,
  };
}
