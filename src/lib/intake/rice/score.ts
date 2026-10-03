import type { RiceConfig } from "@/lib/intake/config/schema";
import type { RiceInputs } from "@/lib/intake/types";

// Configurable RICE scoring. Formula is (reach*impact*confidence)/effort with
// per-dimension weights. Score is only computed when all four inputs exist —
// we never invent a score from partial data.

export type Bucket = "High" | "Medium" | "Low";

export function bucketFor(
  value: number,
  threshold: { high: number; medium: number; inverted: boolean },
): Bucket {
  if (threshold.inverted) {
    // higher value is worse (e.g. effort): big number -> "High" effort
    if (value >= threshold.high) return "High";
    if (value >= threshold.medium) return "Medium";
    return "Low";
  }
  if (value >= threshold.high) return "High";
  if (value >= threshold.medium) return "Medium";
  return "Low";
}

export function computeRiceScore(rice: RiceInputs, config: RiceConfig): number | null {
  const { reach, impact, confidence, effort } = rice;
  if (reach == null || impact == null || confidence == null || effort == null) return null;
  if (effort <= 0) return null;
  const w = config.weights;
  const score = (reach * w.reach * (impact * w.impact) * (confidence * w.confidence)) / (effort * w.effort);
  return Math.round(score * 100) / 100;
}

/** Returns the score-augmented RICE plus the H/M/L buckets for Jira. */
export function scoreRice(
  rice: RiceInputs,
  config: RiceConfig,
): { rice: RiceInputs; buckets: { reach?: Bucket; impact?: Bucket; effort?: Bucket } } {
  const score = computeRiceScore(rice, config);
  const buckets: { reach?: Bucket; impact?: Bucket; effort?: Bucket } = {};
  if (rice.reach != null) buckets.reach = bucketFor(rice.reach, config.thresholds.reach);
  if (rice.impact != null) buckets.impact = bucketFor(rice.impact, config.thresholds.impact);
  if (rice.effort != null) buckets.effort = bucketFor(rice.effort, config.thresholds.effort);
  return { rice: { ...rice, score }, buckets };
}

/** Human-readable RICE block for the brief description. */
export function riceSummaryText(rice: RiceInputs, config: RiceConfig): string {
  const scored = scoreRice(rice, config);
  const lines: string[] = [];
  const fmt10 = (label: string, val: number | null, rationale: string | null, bucket?: Bucket) =>
    `- ${label}: ${val != null ? `${val}/10` : "Not provided"}${bucket ? ` (${bucket})` : ""}${rationale ? ` — ${rationale}` : ""}`;
  lines.push(fmt10("Reach", rice.reach, rice.reachRationale, scored.buckets.reach));
  lines.push(fmt10("Impact", rice.impact, rice.impactRationale, scored.buckets.impact));
  lines.push(fmt10("Confidence", rice.confidence, rice.confidenceRationale));
  lines.push(fmt10("Effort", rice.effort, rice.effortRationale, scored.buckets.effort));
  lines.push(
    `- Preliminary RICE score: ${scored.rice.score ?? "Not computable until all inputs are provided"} (preliminary — not final prioritization)`,
  );
  return lines.join("\n");
}
