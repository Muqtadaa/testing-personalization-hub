// Shared display labels for intake fields (client-safe; no server imports).
import type { IntakeFieldKey } from "@/lib/intake/types";

/** Rewrites assumption/gap strings to be human-readable: swaps any internal
 *  field key for its label, and spaces out any stray camelCase tokens. */
export function humanizeAssumption(text: string): string {
  let out = text;
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    out = out.replace(new RegExp(`\\b${key}\\b`, "g"), label);
  }
  // Fallback: split leftover camelCase identifiers (e.g. "fooBar" -> "foo bar").
  out = out.replace(/\b[a-z]+(?:[A-Z][a-z0-9]+)+\b/g, (m) =>
    m.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase(),
  );
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export const FIELD_LABELS: Record<string, string> = {
  submitterName: "Submitter name",
  submitterEmail: "Submitter email",
  submitterTeam: "Submitter team",
  briefTitle: "Brief title",
  briefSummary: "Brief summary",
  lineOfBusiness: "Line of business",
  journeySegment: "Journey segment",
  endUserPlatform: "End-user platform",
  requestType: "Request type",
  pageOrUrl: "Page / flow / surface / URL",
  targetAudience: "Target audience",
  businessContext: "Context",
  targetImprovement: "Desired outcome / goal",
  hypothesis: "Hypothesis",
  variationIdeas: "Variation / design ideas",
  supportingEvidence: "Supporting evidence",
  baselineMetrics: "Baseline metrics",
  primarySuccessMetric: "Primary success metric",
  secondarySuccessMetrics: "Secondary success metrics",
  guardrailMetrics: "Guardrail metrics",
  desiredLaunchTiming: "Desired launch timing",
  resultsNeededBy: "Results needed by (YYYY-MM-DD)",
  designResearchGuidance: "Design / research guidance",
  technicalDependencies: "Technical / data dependencies",
  openQuestions: "Open questions",
};

/** Fields rendered as long-form text areas in the editor. */
export const LONG_FIELDS: Set<string> = new Set<IntakeFieldKey>([
  "businessContext",
  "hypothesis",
  "variationIdeas",
  "supportingEvidence",
  "baselineMetrics",
  "guardrailMetrics",
  "targetImprovement",
  "designResearchGuidance",
  "technicalDependencies",
  "openQuestions",
  "briefSummary",
  "targetAudience",
]);

export const EDITABLE_ORDER: IntakeFieldKey[] = [
  "briefTitle",
  "briefSummary",
  "submitterName",
  "submitterEmail",
  "submitterTeam",
  "lineOfBusiness",
  "journeySegment",
  "endUserPlatform",
  "requestType",
  "pageOrUrl",
  "targetAudience",
  "businessContext",
  "hypothesis",
  "variationIdeas",
  "supportingEvidence",
  "baselineMetrics",
  "primarySuccessMetric",
  "secondarySuccessMetrics",
  "guardrailMetrics",
  "targetImprovement",
  "desiredLaunchTiming",
  "resultsNeededBy",
  "designResearchGuidance",
  "technicalDependencies",
  "openQuestions",
];

export const SELECT_FIELDS: Partial<Record<IntakeFieldKey, keyof TaxonomyKeys>> = {
  lineOfBusiness: "lineOfBusiness",
  journeySegment: "journeySegment",
  endUserPlatform: "endUserPlatform",
  requestType: "requestType",
};

type TaxonomyKeys = {
  lineOfBusiness: string[];
  journeySegment: string[];
  endUserPlatform: string[];
  requestType: string[];
};
