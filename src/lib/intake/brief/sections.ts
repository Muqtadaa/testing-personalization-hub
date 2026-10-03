import { DEFAULT_CONFIG } from "@/lib/intake/config/defaults";
import { riceSummaryText } from "@/lib/intake/rice/score";
import type { BriefSection, IntakeFields, RiceInputs } from "@/lib/intake/types";

// Deterministic, collapsed brief builder. Used by the mock provider and as a
// safety net; the Anthropic provider produces richer prose but the same shape.
// Uses only provided data — missing fields render as "Not provided". The Summary
// amalgamates context/problem/outcome/evidence and there is a distinct Hypothesis.

const NP = "Not provided";
const v = (s: string | null | undefined) => (s && s.trim() ? s.trim() : NP);
const has = (s: string | null | undefined): s is string => !!(s && s.trim());
const t = (s: string | null | undefined) => (s ?? "").trim();

/** The amalgamated Summary narrative. The editable briefSummary is authoritative
 *  (WYSIWYG with the review page); when it's empty we compose one from context +
 *  desired outcome + supporting evidence. */
export function composeSummary(f: IntakeFields): string {
  if (has(f.briefSummary)) return t(f.briefSummary);
  const parts: string[] = [];
  if (has(f.businessContext)) parts.push(t(f.businessContext));
  if (has(f.targetImprovement)) parts.push(`Desired outcome: ${t(f.targetImprovement)}`);
  if (has(f.supportingEvidence)) parts.push(`Supporting evidence: ${t(f.supportingEvidence)}`);
  return parts.length ? parts.join("\n\n") : NP;
}

/** "By doing X, we will impact Y, because Z, leading to [desired outcome]."
 *  Uses the editable hypothesis field when set; otherwise composes from parts,
 *  marking it provisional when key inputs are still missing. Exported so brief
 *  generation can backfill the hypothesis field. */
export function composeHypothesis(f: IntakeFields): string {
  if (has(f.hypothesis)) return t(f.hypothesis);
  const x = t(f.variationIdeas) || "the proposed test";
  const y = t(f.primarySuccessMetric);
  const z = t(f.businessContext) || t(f.supportingEvidence);
  const outcome = t(f.targetImprovement);
  if (!y && !outcome && !has(f.businessContext)) return NP;
  const sentence =
    `By doing ${x}, ` +
    `we will impact ${y || "[the primary success metric]"}, ` +
    `because ${z || "[the supporting rationale]"}, ` +
    `leading to ${outcome || "[the desired outcome]"}.`;
  const provisional = !y || !outcome || !z;
  return provisional
    ? `${sentence}\n\n(Provisional — bracketed parts still need confirming.)`
    : sentence;
}

/** The single organized "Context" section body. */
function composeContext(f: IntakeFields): string {
  const parts = [
    `Business context: ${v(f.businessContext)}`,
    `Supporting evidence: ${v(f.supportingEvidence)}`,
    `Desired outcome: ${v(f.targetImprovement)}`,
  ];
  return parts.join("\n");
}

export function buildBriefSections(
  f: IntakeFields,
  rice: RiceInputs,
  routingNotes: string[],
): BriefSection[] {
  const classification = [
    `Line of Business: ${v(f.lineOfBusiness)}`,
    `Journey Segment: ${v(f.journeySegment)}`,
    `End User Platform: ${v(f.endUserPlatform)}`,
    `Request Type: ${v(f.requestType)}`,
    `Page / Flow / Surface: ${v(f.pageOrUrl)}`,
    `Target Audience: ${v(f.targetAudience)}`,
  ].join("\n");

  // Metrics, collapsed — only render the lines that have a value.
  const metrics =
    [
      has(f.primarySuccessMetric) ? `Primary success metric: ${t(f.primarySuccessMetric)}` : "",
      has(f.secondarySuccessMetrics) ? `Secondary metrics: ${t(f.secondarySuccessMetrics)}` : "",
      has(f.guardrailMetrics) ? `Guardrail metrics: ${t(f.guardrailMetrics)}` : "",
      has(f.baselineMetrics) ? `Baseline: ${t(f.baselineMetrics)}` : "",
      has(f.targetImprovement) ? `Goal / desired outcome: ${t(f.targetImprovement)}` : "",
    ]
      .filter(Boolean)
      .join("\n") || NP;

  const timeline = [
    `Desired launch timing: ${v(f.desiredLaunchTiming)}`,
    `Results needed by: ${v(f.resultsNeededBy)}`,
  ].join("\n");

  // Variations & design — variation ideas + design/research guidance.
  const variations =
    [
      has(f.variationIdeas) ? t(f.variationIdeas) : "",
      has(f.designResearchGuidance) ? `Design / research guidance: ${t(f.designResearchGuidance)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n") || NP;

  // Dependencies & open questions, with preliminary routing for triage.
  const dependencies =
    [
      has(f.technicalDependencies) ? `Dependencies: ${t(f.technicalDependencies)}` : "",
      has(f.openQuestions) ? `Open questions: ${t(f.openQuestions)}` : "",
      routingNotes.length ? `Preliminary routing (triage only): ${routingNotes.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n") || NP;

  // Summary and Hypothesis are rendered from the brief's top-level fields (see
  // briefToAdf), so they are intentionally NOT included as sections here.
  return [
    { heading: "Context", body: composeContext(f) },
    { heading: "Classification", body: classification },
    { heading: "Metrics", body: metrics },
    { heading: "Timeline", body: timeline },
    { heading: "Variations & Design", body: variations },
    { heading: "Dependencies & Open Questions", body: dependencies },
    {
      heading: "RICE Inputs and Preliminary Score",
      body: riceSummaryText(rice, DEFAULT_CONFIG.rice),
    },
  ];
}
