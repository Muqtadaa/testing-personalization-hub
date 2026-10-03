import { NextResponse } from "next/server";
import { JIRA_FIELDS } from "@/lib/intake/config/jira-env";
import { getConfig } from "@/lib/intake/config/service";
import type { AppConfig } from "@/lib/intake/config/schema";
import { createIntake, getImproveDraft, saveIntake } from "@/lib/intake/db/intakes";
import { getIssue, getJiraCreds, hasJiraCreds } from "@/lib/intake/jira/client";
import { issueToSeed } from "@/lib/intake/jira/reverse";
import { normalizeIssue } from "@/lib/roadmap/normalize";
import { reviewTickets } from "@/lib/roadmap/review/review";
import { BRIEF_GAP_LABELS, RICE_GAP_LABELS, type TicketReview } from "@/lib/roadmap/review/types";

// POST /api/intake/improve/[issueKey] — seed-or-get the "improve the brief"
// intake draft for an existing Jira ticket. Idempotent per issue: an existing
// in-progress draft is continued; otherwise the ticket is fetched, reviewed for
// gaps, reverse-mapped into a seeded draft, and returned.

export const dynamic = "force-dynamic";

/** Jira field IDs the seed + review need, resolved from config. */
function fetchFields(config: AppConfig): string[] {
  const byIntake: Record<string, string> = {};
  for (const m of config.fieldMappings) byIntake[m.intakeField] = m.jiraFieldId;
  return [
    "summary",
    "description",
    "updated",
    "status",
    byIntake["lineOfBusiness"] ?? JIRA_FIELDS.lineOfBusiness,
    byIntake["journeySegment"] ?? JIRA_FIELDS.journey,
    byIntake["requestType"] ?? JIRA_FIELDS.requestType,
    byIntake["rice.reach"] ?? JIRA_FIELDS.riceReach,
    byIntake["rice.impact"] ?? JIRA_FIELDS.riceImpact,
    byIntake["rice.effort"] ?? JIRA_FIELDS.riceEffort,
  ];
}

function greeting(key: string, gaps: TicketReview): string {
  const bits: string[] = [];
  if (gaps.briefMissing.length)
    bits.push(`add ${gaps.briefMissing.map((g) => BRIEF_GAP_LABELS[g]).join(", ")}`);
  if (gaps.riceMissing.length)
    bits.push(`set RICE ${gaps.riceMissing.map((g) => RICE_GAP_LABELS[g]).join(", ")}`);
  if (!bits.length) {
    return `I've pulled in ${key}. The review didn't find any gaps — its brief and RICE look complete. You can still tell me anything you'd like to refine, or head back to the roadmap.`;
  }
  const count = gaps.briefMissing.length + gaps.riceMissing.length;
  const noun = count === 1 ? "one gap" : `${count} gaps`;
  return `I've pulled in ${key} and its current details. A review flagged ${noun} to close before this ticket is ready. Let's ${bits.join(" and ")}. I'll ask only about ${count === 1 ? "that" : "those"} — everything else stays as-is.`;
}

export async function POST(_req: Request, ctx: { params: Promise<{ issueKey: string }> }) {
  try {
    const { issueKey } = await ctx.params;
    if (!hasJiraCreds()) {
      return NextResponse.json({ error: "Jira is not configured." }, { status: 503 });
    }

    const config = await getConfig();
    const creds = getJiraCreds();
    const issue = await getIssue(creds, issueKey, fetchFields(config));
    const item = normalizeIssue(issue, { config, baseUrl: creds.baseUrl });
    // The original ticket context, so the UI can show the user what they're
    // improving (the conversation mutates the record's fields, so this is read
    // straight off Jira each load rather than derived from the draft).
    const ticket = { key: issueKey, summary: item.summary, brief: item.brief, url: item.url };

    // Always re-derive gaps from the ticket as it stands now, so the
    // "Needs attention" panel reflects reality (and not a stale snapshot from
    // when the draft was first opened). Cheap: a cached/solid ticket is a hit.
    const [review] = await reviewTickets([item]);

    // Continue an existing draft for this ticket if one is in progress.
    const existing = await getImproveDraft(issueKey);
    if (existing) {
      let dirty = false;
      if (review && JSON.stringify(existing.improveGaps) !== JSON.stringify(review)) {
        existing.improveGaps = review;
        dirty = true;
      }
      // Keep the opening assistant message in sync with the live gaps so the chat
      // never contradicts the "Needs attention" panel (e.g. a draft opened when
      // problem statement was missing, reopened after it was added in Jira).
      if (review) {
        const opener = existing.messages[0];
        const want = greeting(issueKey, review);
        if (opener && opener.role === "assistant" && opener.content !== want) {
          existing.messages = [{ ...opener, content: want }, ...existing.messages.slice(1)];
          dirty = true;
        }
      }
      if (dirty) await saveIntake(existing);
      return NextResponse.json({ intake: existing, ticket });
    }
    const seed = issueToSeed(issue, config);

    const record = await createIntake({
      mode: "improve",
      jiraIssueKey: issueKey,
      jiraUrl: item.url,
      improveGaps: review ?? null,
      fields: seed.fields,
    });
    record.messages.push({
      role: "assistant",
      content: greeting(issueKey, review),
      at: new Date().toISOString(),
    });
    await saveIntake(record);

    return NextResponse.json({ intake: record, ticket });
  } catch (err) {
    console.error("[api/intake/improve/:issueKey] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
