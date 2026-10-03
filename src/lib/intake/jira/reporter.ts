import type { JiraTarget } from "@/lib/intake/config/schema";
import { getJiraCreds, searchUsersByEmail } from "./client";

// Resolves the submitter email to a Jira accountId for the reporter field.
// On no match (or hidden email privacy), falls back to the configured service
// account and signals that submitter identity must be recorded in the brief.

export interface ReporterResolution {
  accountId: string | null;
  matchedSubmitter: boolean;
  /** When the submitter couldn't be matched, this note is added to the brief. */
  preambleNote: string | null;
}

export async function resolveReporter(
  jira: JiraTarget,
  submitterEmail: string | null,
  submitterName: string | null,
): Promise<ReporterResolution> {
  const fallback = jira.serviceAccountId;
  const identity = `${submitterName ?? "Unknown submitter"}${submitterEmail ? ` <${submitterEmail}>` : ""}`;

  if (!submitterEmail) {
    return {
      accountId: fallback,
      matchedSubmitter: false,
      preambleNote: `Submitted by: ${identity} (no email provided; reporter set to service account).`,
    };
  }

  try {
    const creds = getJiraCreds();
    const users = await searchUsersByEmail(creds, submitterEmail);
    const match = users.find(
      (u) => u.emailAddress?.toLowerCase() === submitterEmail.toLowerCase(),
    );
    if (match) {
      return { accountId: match.accountId, matchedSubmitter: true, preambleNote: null };
    }
  } catch (err) {
    console.warn("[reporter] user lookup failed, using fallback:", err);
  }

  return {
    accountId: fallback,
    matchedSubmitter: false,
    preambleNote: `Submitted by: ${identity} (not a recognized Jira account; reporter set to service account).`,
  };
}
