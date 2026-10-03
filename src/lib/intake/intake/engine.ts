import { getConfig } from "@/lib/intake/config/service";
import { saveIntake } from "@/lib/intake/db/intakes";
import { getLLMProvider } from "@/lib/intake/llm";
import { scoreRice } from "@/lib/intake/rice/score";
import { missingRequired } from "@/lib/intake/validation/required";
import { normalizeFutureDate, stripEmoji } from "@/lib/intake/text";
import type { IntakeRecord, RiceInputs } from "@/lib/intake/types";

// Conversation state manager: applies one user turn to an intake record.
// Merges extracted fields (never clobbering with empties), updates confidences,
// recomputes the RICE score, refreshes the missing-field list, and persists.

// Fields that resolve to exactly one value -> always single-select.
const SINGLE_SELECT_FIELDS = new Set([
  "lineOfBusiness",
  "journeySegment",
  "endUserPlatform",
  "requestType",
  "primarySuccessMetric",
  "submitterName",
  "submitterEmail",
  "submitterTeam",
  "briefTitle",
  "briefSummary",
  "resultsNeededBy",
  "desiredLaunchTiming",
]);
// Descriptive fields where multiple options legitimately coexist -> multi-select.
const MULTI_SELECT_FIELDS = new Set([
  "variationIdeas",
  "targetAudience",
  "secondarySuccessMetrics",
  "guardrailMetrics",
  "pageOrUrl",
  "supportingEvidence",
  "businessContext",
  "technicalDependencies",
  "designResearchGuidance",
  "openQuestions",
  "baselineMetrics",
  "targetImprovement",
]);

/** Deterministic single/multi decision for known field ids; falls back to the
 *  model's choice for anything unrecognized. */
function resolveMultiSelect(id: string, modelChoice: boolean): boolean {
  if (SINGLE_SELECT_FIELDS.has(id)) return false;
  if (MULTI_SELECT_FIELDS.has(id)) return true;
  return modelChoice;
}

function mergeRice(current: RiceInputs, update: Partial<RiceInputs>): RiceInputs {
  const next = { ...current };
  for (const [k, val] of Object.entries(update) as [keyof RiceInputs, unknown][]) {
    if (val !== undefined && val !== null) (next[k] as unknown) = val;
  }
  return next;
}

export async function processUserTurn(
  record: IntakeRecord,
  userText: string,
): Promise<IntakeRecord> {
  const config = await getConfig();
  const provider = getLLMProvider();

  record.messages.push({ role: "user", content: userText, at: new Date().toISOString() });

  // A draft already linked to a Jira ticket is necessarily an "improve" record
  // (fresh intakes only get a key once submitted). Deriving it here keeps the
  // conversation gap-focused even if the optional `mode` column was dropped
  // (migration not yet applied), so the feature degrades gracefully.
  const isImprove =
    record.mode === "improve" || (!!record.jiraIssueKey && record.status === "draft");

  const result = await provider.intakeTurn({
    config,
    history: record.messages,
    fields: record.fields,
    confidences: record.confidences,
    unresolvedAssumptions: record.unresolvedAssumptions,
    phase: record.phase,
    mode: isImprove ? "improve" : record.mode,
    improveGaps: record.improveGaps,
  });

  // Merge non-empty extracted fields.
  for (const [k, val] of Object.entries(result.extracted)) {
    if (val != null && `${val}`.trim() !== "") {
      (record.fields as unknown as Record<string, unknown>)[k] = val;
    }
  }
  record.confidences = { ...record.confidences, ...result.confidences };
  record.fields.rice = mergeRice(record.fields.rice, result.riceUpdate);

  // Never let a results-needed date land in the past (assume current/next year).
  record.fields.resultsNeededBy = normalizeFutureDate(record.fields.resultsNeededBy);

  // Recompute preliminary score from merged inputs.
  record.fields.rice = scoreRice(record.fields.rice, config.rice).rice;

  // Track gaps. The model returns the authoritative full set each turn, so we
  // REPLACE (don't merge) — resolved assumptions disappear, deduped for safety.
  record.missingFields = missingRequired(record.fields, config);
  record.unresolvedAssumptions = [...new Set(result.unresolvedAssumptions.map(stripEmoji))];

  // Store guided questions (emoji-stripped), capped to the most important few so
  // the card stays focused; any remaining gaps resurface on the next turn.
  const MAX_QUESTIONS = 5;
  record.pendingQuestions = result.questions.slice(0, MAX_QUESTIONS).map((q) => ({
    ...q,
    multiSelect: resolveMultiSelect(q.id, q.multiSelect),
    question: stripEmoji(q.question),
    options: q.options.map((o) => ({
      ...o,
      label: stripEmoji(o.label),
      description: o.description ? stripEmoji(o.description) : undefined,
    })),
  }));

  record.messages.push({
    role: "assistant",
    content: stripEmoji(result.assistantMessage),
    at: new Date().toISOString(),
  });

  return saveIntake(record);
}
