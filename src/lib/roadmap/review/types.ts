// Ticket review agent — shared types. A review flags two kinds of gap on an
// early-pipeline ticket (Intake / Backlog / Prioritized):
//   1. Missing RICE select fields (deterministic, from the normalized item).
//   2. A weak brief (LLM-judged): missing problem statement, hypothesis, or
//      variation ideas — the minimum a usable brief needs.

/** The three minimum-brief elements the review judges. */
export type BriefGap = "problemStatement" | "hypothesis" | "variationIdeas";

/** RICE dimensions that exist as Jira select fields (Confidence has none). */
export type RiceGap = "reach" | "impact" | "effort";

export interface TicketReview {
  key: string;
  /** Jira `updated` this review was computed against — the cache key. Any Jira
   *  edit bumps `updated`, which invalidates the cached review automatically. */
  updated: string;
  /** RICE select fields that are unset. Deterministic — no LLM. */
  riceMissing: RiceGap[];
  /** Minimum-brief elements judged absent or inadequate. LLM-judged. */
  briefMissing: BriefGap[];
  /** briefMissing.length === 0 */
  briefAdequate: boolean;
  /** riceMissing.length > 0 || !briefAdequate */
  flagged: boolean;
  /** One-line human reason for the tooltip / banner, or null when not flagged. */
  summary: string | null;
  /** ISO compute time. */
  reviewedAt: string;
  /** Which LLM path judged the brief. */
  llmKind: "anthropic" | "mock";
}

// Lowercase labels for use mid-sentence (prompts, greeting copy).
export const BRIEF_GAP_LABELS: Record<BriefGap, string> = {
  problemStatement: "problem statement",
  hypothesis: "hypothesis",
  variationIdeas: "variation ideas",
};

export const RICE_GAP_LABELS: Record<RiceGap, string> = {
  reach: "Reach",
  impact: "Impact",
  effort: "Effort",
};

// Title-case, consistently phrased labels for standalone UI display (e.g. the
// "Needs" list on the improve page). Each is a noun phrase naming what to add.
export const BRIEF_GAP_DISPLAY: Record<BriefGap, string> = {
  problemStatement: "Problem statement",
  hypothesis: "Hypothesis",
  variationIdeas: "Variation ideas",
};

export const RICE_GAP_DISPLAY: Record<RiceGap, string> = {
  reach: "Reach score",
  impact: "Impact score",
  effort: "Effort score",
};
