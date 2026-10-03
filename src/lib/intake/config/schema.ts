import { z } from "zod";

// ---------------------------------------------------------------------------
// Central configuration schema. EVERY Jira id, accepted value, taxonomy entry,
// RICE threshold, routing rule, and required-field list lives here (seeded in
// defaults.ts, overridable via the Supabase `app_config` row). Nothing Jira-
// specific should be hardcoded elsewhere in the codebase.
// ---------------------------------------------------------------------------

export const JiraTargetSchema = z.object({
  baseUrl: z.string().url(),
  cloudId: z.string(),
  projectKey: z.string(),
  projectId: z.string(),
  issueTypeId: z.string(),
  issueTypeName: z.string(),
  /** Workflow status new tickets must end up in (create then transition). */
  intakeStatusName: z.string(),
  /** Fallback reporter accountId when submitter email isn't a Jira user. */
  serviceAccountId: z.string().nullable(),
});

/** How a single intake field maps onto a Jira field. */
export const FieldMappingSchema = z.object({
  intakeField: z.string(), // key of IntakeFields (or "rice.reach" etc.)
  jiraFieldId: z.string(), // e.g. "summary", "customfield_10001"
  kind: z.enum(["summary", "adf-description", "text", "select", "date", "labels"]),
  /** For selects: intake taxonomy value -> Jira optionId. Values intentionally
   *  omitted here are "unmappable" and must be resolved/blocked before submit. */
  valueMap: z.record(z.string(), z.string()).optional(),
  /** Whether Jira requires this field (drives the submit gate). */
  requiredByJira: z.boolean().default(false),
  /** Optional human note shown in admin UI. */
  note: z.string().optional(),
});

export const RiceThresholdSchema = z.object({
  // Values at or above `high` -> "High"; at or above `medium` -> "Medium"; else "Low".
  high: z.number(),
  medium: z.number(),
  /** If true (effort), a HIGHER number is WORSE, so bucket labels invert. */
  inverted: z.boolean().default(false),
});

/** Admin-set starting anchors for Reach/Impact (1-10) by Brand x Journey. These
 *  are NOT final scores — the model begins from them and adjusts to the specific
 *  request, always with a rationale. Confidence/Effort stay per-test (not seeded
 *  here). Any field may be null/omitted -> "no anchor, score from first principles". */
export const RiceAnchorSchema = z.object({
  reach: z.number().min(1).max(10).nullable().default(null),
  impact: z.number().min(1).max(10).nullable().default(null),
  /** Optional one-line rationale shown to the model with the anchor. */
  note: z.string().optional(),
});

export const RiceConfigSchema = z.object({
  /** Formula is fixed as (reach*impact*confidence)/effort but weights allow tuning. */
  weights: z.object({
    reach: z.number().default(1),
    impact: z.number().default(1),
    confidence: z.number().default(1),
    effort: z.number().default(1),
  }),
  /** Allowed impact scale presented to the model (label + numeric value). */
  impactScale: z.array(z.object({ label: z.string(), value: z.number() })),
  thresholds: z.object({
    reach: RiceThresholdSchema,
    impact: RiceThresholdSchema,
    effort: RiceThresholdSchema,
  }),
  /** Maps a bucket label to the Jira select optionId for Reach/Impact/Effort. */
  bucketOptionIds: z.object({
    reach: z.record(z.string(), z.string()),
    impact: z.record(z.string(), z.string()),
    effort: z.record(z.string(), z.string()),
  }),
  /** Reach/Impact starting anchors keyed by Line of Business -> Journey Segment
   *  (display values). Admin-editable; empty by default (no anchors). */
  journeyDefaults: z
    .record(z.string(), z.record(z.string(), RiceAnchorSchema))
    .default({}),
});

export const RoutingRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  /** Simple match on intake fields; all present conditions must match. */
  when: z.record(z.string(), z.string()),
  /** Preliminary routing hints (NOT used to move the ticket past Intake). */
  suggestedLabels: z.array(z.string()).default([]),
  suggestedDisciplines: z.array(z.string()).default([]),
});

export const MetricLibrarySchema = z.object({
  primary: z.array(z.string()),
  guardrail: z.array(z.string()),
  /** Optional per-journey suggestions keyed by journeySegment value. */
  byJourney: z.record(z.string(), z.array(z.string())).optional(),
});

export const TaxonomySchema = z.object({
  lineOfBusiness: z.array(z.string()),
  journeySegment: z.array(z.string()),
  endUserPlatform: z.array(z.string()),
  requestType: z.array(z.string()),
});

export const LabelConfigSchema = z.object({
  base: z.array(z.string()),
  platformPrefix: z.string(), // e.g. "platform:" -> platform:customer
  needsManualReview: z.string(),
});

export const AppConfigSchema = z.object({
  version: z.number().default(1),
  jira: JiraTargetSchema,
  taxonomy: TaxonomySchema,
  fieldMappings: z.array(FieldMappingSchema),
  rice: RiceConfigSchema,
  routingRules: z.array(RoutingRuleSchema),
  /** Intake field keys required before Jira submission is allowed (the "core"
   *  tier). Keep this minimal so less-knowledgeable users can finalize quickly. */
  requiredFields: z.array(z.string()),
  /** Optional "secondary" intake field keys the assistant pursues only after the
   *  core is complete and the user chooses to add more detail. Never block submit. */
  secondaryFields: z.array(z.string()).default([]),
  metricLibrary: MetricLibrarySchema,
  labels: LabelConfigSchema,
  /** Per-brand reference context injected into the intake/brief prompts, keyed by
   *  Line of Business display value (e.g. { "Online Store": "...", Marketplace: "..." }). Helps the
   *  model make brand-aware suggestions. Admin-editable; empty => no brand context. */
  brandContext: z.record(z.string(), z.string()).default({}),
  /** Shared, cross-brand program context (e.g. the testing tech stack) injected
   *  into prompts regardless of the selected Line of Business. */
  programContext: z.string().default(""),
  /** Optional derived-field rules (kept optional to avoid guessing). */
  derived: z
    .object({
      // LOB value -> journey-platform optionId. Empty => leave field unset.
      journeyPlatformByLob: z.record(z.string(), z.string()).default({}),
      // requestType value -> Category optionId. Empty => leave field unset.
      categoryByRequestType: z.record(z.string(), z.string()).default({}),
    })
    .default({ journeyPlatformByLob: {}, categoryByRequestType: {} }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type FieldMapping = z.infer<typeof FieldMappingSchema>;
export type JiraTarget = z.infer<typeof JiraTargetSchema>;
export type RiceConfig = z.infer<typeof RiceConfigSchema>;
export type RoutingRule = z.infer<typeof RoutingRuleSchema>;
