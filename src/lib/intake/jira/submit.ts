import { getConfig } from "@/lib/intake/config/service";
import { saveIntake } from "@/lib/intake/db/intakes";
import { briefFromFields } from "@/lib/intake/brief/generate";
import { validateForSubmit, type ValidationIssue } from "@/lib/intake/validation/required";
import type { GeneratedBrief, IntakeRecord } from "@/lib/intake/types";
import { readBlob } from "@/lib/intake/storage/blob";
import {
  addAttachment,
  createIssue,
  doTransition,
  getJiraCreds,
  getTransitions,
  hasJiraCreds,
} from "./client";
import { buildJiraPayload, type MappedPayload } from "./mapping";
import { resolveReporter } from "./reporter";

// Orchestrates Jira submission. Dry-run (default) returns the exact payload
// without writing. Real mode creates the issue then transitions it into the
// configured Intake status. Never moves the issue beyond Intake.

export interface SubmitResult {
  dryRun: boolean;
  brief: GeneratedBrief;
  payloadSummary: MappedPayload["summary"];
  fields: Record<string, unknown>;
  issueKey?: string;
  issueUrl?: string;
  transitioned?: boolean;
  finalStatus?: string;
  blocked?: ValidationIssue[];
  warnings: string[];
}

function isDryRunDefault(): boolean {
  // Default to dry-run unless explicitly disabled.
  return process.env.JIRA_DRY_RUN !== "false";
}

export async function submitIntake(
  record: IntakeRecord,
  opts: { dryRunOverride?: boolean } = {},
): Promise<SubmitResult> {
  const config = await getConfig();
  const warnings: string[] = [];

  // Hard gate: never submit an incomplete intake.
  const validation = validateForSubmit(record.fields, config);
  if (!validation.ok) {
    return {
      dryRun: true,
      brief: await briefFromFields(record),
      payloadSummary: [],
      fields: {},
      blocked: validation.issues,
      warnings,
    };
  }

  const brief = await briefFromFields(record);
  const reporter = await resolveReporter(
    config.jira,
    record.fields.submitterEmail,
    record.fields.submitterName,
  );
  if (!reporter.matchedSubmitter) {
    warnings.push("Submitter email not matched to a Jira account; recorded in the brief and using the service account as reporter.");
  }

  const mapped = buildJiraPayload(record, brief, reporter, config);

  const credsAvailable = hasJiraCreds();
  const dryRun = opts.dryRunOverride ?? (isDryRunDefault() || !credsAvailable);
  if (!credsAvailable && opts.dryRunOverride === false) {
    warnings.push("Jira credentials are not configured; forced dry-run.");
  }

  record.brief = brief;
  if (dryRun) {
    await saveIntake(record);
    return {
      dryRun: true,
      brief,
      payloadSummary: mapped.summary,
      fields: mapped.fields,
      warnings,
    };
  }

  // Real submission.
  const creds = getJiraCreds();
  const created = await createIssue(creds, mapped.fields);
  const issueUrl = `${config.jira.baseUrl}/browse/${created.key}`;

  // Upload screenshots + mockups. Failures are non-fatal — the ticket still files.
  for (const att of record.attachments) {
    try {
      const blob = await readBlob(att.blobPath);
      if (!blob) {
        warnings.push(`Attachment "${att.filename}" could not be read and was not uploaded.`);
        continue;
      }
      await addAttachment(creds, created.key, att.filename, att.contentType, blob.bytes);
    } catch (err) {
      warnings.push(`Failed to attach "${att.filename}": ${(err as Error).message}`);
    }
  }

  let transitioned = false;
  let finalStatus: string | undefined;
  try {
    const target = config.jira.intakeStatusName.toLowerCase();
    const transitions = await getTransitions(creds, created.key);
    const t = transitions.find((tr) => tr.to?.name?.toLowerCase() === target);
    if (t) {
      await doTransition(creds, created.key, t.id);
      transitioned = true;
      finalStatus = config.jira.intakeStatusName;
    } else {
      warnings.push(
        `No transition into "${config.jira.intakeStatusName}" was available; ticket left in its created status for manual triage.`,
      );
    }
  } catch (err) {
    warnings.push(`Created ${created.key} but transition to Intake failed: ${(err as Error).message}`);
  }

  record.status = "submitted";
  record.jiraIssueKey = created.key;
  record.jiraUrl = issueUrl;
  record.dryRun = false;
  await saveIntake(record);

  return {
    dryRun: false,
    brief,
    payloadSummary: mapped.summary,
    fields: mapped.fields,
    issueKey: created.key,
    issueUrl,
    transitioned,
    finalStatus,
    warnings,
  };
}
