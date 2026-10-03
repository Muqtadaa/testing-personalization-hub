import type { AppConfig } from "./schema";
import { JIRA_FIELDS, JIRA_INSTANCE, JIRA_OPTIONS } from "./jira-env";
import {
  MARKETPLACE_CONTEXT,
  ONLINE_STORE_CONTEXT,
  PROGRAM_CONTEXT,
  REWARDS_APP_CONTEXT,
} from "./context-content";

// ---------------------------------------------------------------------------
// SEED configuration. All Jira ids / option ids come from ./jira-env, which reads
// JIRA_* environment variables with neutral placeholder defaults.
// This object seeds the Supabase `app_config` row and is the fallback if the DB
// is unavailable. Admins edit the live copy via /admin/config — not this file.
// ---------------------------------------------------------------------------

// Intake-side taxonomy display values (what the user/assistant choose from).
const LOB = ["Online Store", "Marketplace", "Rewards App", "Multi-brand", "Unknown"];
const JOURNEY = ["Acquisition", "Conversion", "Retention", "Cross-journey", "Unknown"];
const PLATFORM = ["Customer", "Associate", "Partner", "Multi-platform", "Unknown"];
const REQUEST_TYPE = [
  "Optimization / A/B Test",
  "Personalization Campaign",
  "Research / Discovery",
  "Workshop",
  "Unsure / Needs Recommendation",
  "Other / Needs Manual Review",
];

export const DEFAULT_CONFIG: AppConfig = {
  version: 1,

  jira: {
    baseUrl: JIRA_INSTANCE.baseUrl,
    cloudId: JIRA_INSTANCE.cloudId,
    projectKey: JIRA_INSTANCE.projectKey,
    projectId: JIRA_INSTANCE.projectId,
    issueTypeId: JIRA_INSTANCE.issueTypeId,
    issueTypeName: "Task",
    intakeStatusName: "Intake",
    serviceAccountId: JIRA_INSTANCE.serviceAccountId, // fallback reporter
  },

  taxonomy: {
    lineOfBusiness: LOB,
    journeySegment: JOURNEY,
    endUserPlatform: PLATFORM,
    requestType: REQUEST_TYPE,
  },

  fieldMappings: [
    {
      intakeField: "briefTitle",
      jiraFieldId: "summary",
      kind: "summary",
      requiredByJira: true,
      note: "Jira summary / ticket title.",
    },
    {
      intakeField: "__brief__",
      jiraFieldId: "description",
      kind: "adf-description",
      requiredByJira: false,
      note: "Full structured brief rendered as ADF.",
    },
    {
      intakeField: "requestType",
      jiraFieldId: JIRA_FIELDS.requestType,
      kind: "select",
      requiredByJira: true,
      // Unsure / Other are intentionally absent -> resolved in conversation.
      valueMap: JIRA_OPTIONS.requestType,
      note: "Request Type (required). Options: Optimization/Personalization/Research/Workshop.",
    },
    {
      intakeField: "lineOfBusiness",
      jiraFieldId: JIRA_FIELDS.lineOfBusiness,
      kind: "select",
      requiredByJira: true,
      // Multi-brand / Unknown intentionally absent -> blocked until resolved.
      valueMap: JIRA_OPTIONS.lineOfBusiness,
      note: "Line of Business (required).",
    },
    {
      intakeField: "journeySegment",
      jiraFieldId: JIRA_FIELDS.journey,
      kind: "select",
      requiredByJira: true,
      // Cross-journey / Unknown intentionally absent -> blocked until resolved.
      valueMap: JIRA_OPTIONS.journey,
      note: "Journey (required).",
    },
    {
      intakeField: "resultsNeededBy",
      jiraFieldId: "duedate",
      kind: "date",
      requiredByJira: false,
      note: "Due date (set from results-needed date when ISO-parseable).",
    },
    // RICE selects are written by the RICE service via bucketOptionIds, but we
    // record the field ids here for the admin view / mapping completeness.
    {
      intakeField: "rice.reach",
      jiraFieldId: JIRA_FIELDS.riceReach,
      kind: "select",
      requiredByJira: false,
      note: "Reach (High/Medium/Low).",
    },
    {
      intakeField: "rice.impact",
      jiraFieldId: JIRA_FIELDS.riceImpact,
      kind: "select",
      requiredByJira: false,
      note: "Impact (High/Medium/Low).",
    },
    {
      intakeField: "rice.effort",
      jiraFieldId: JIRA_FIELDS.riceEffort,
      kind: "select",
      requiredByJira: false,
      note: "Effort (High/Medium/Low).",
    },
  ],

  rice: {
    weights: { reach: 1, impact: 1, confidence: 1, effort: 1 },
    // Each attribute is scored 1-10 from the assumptions.
    impactScale: [
      { label: "Very high", value: 10 },
      { label: "High", value: 8 },
      { label: "Medium", value: 5 },
      { label: "Low", value: 3 },
      { label: "Very low", value: 1 },
    ],
    thresholds: {
      // All on the 1-10 scale: >=7 High, >=4 Medium, else Low.
      reach: { high: 7, medium: 4, inverted: false },
      impact: { high: 7, medium: 4, inverted: false },
      // Effort: a higher score is MORE effort (worse), so bucket labels invert.
      effort: { high: 7, medium: 4, inverted: true },
    },
    bucketOptionIds: JIRA_OPTIONS.rice,
    // Reach/Impact anchors by Brand x Journey. Empty by default — set in /admin
    // (no invented values). Shape: { [LOB]: { [Journey]: { reach, impact, note } } }.
    journeyDefaults: {},
  },

  routingRules: [
    {
      id: "personalization-strategy",
      description: "Personalization campaigns need personalization strategy review.",
      when: { requestType: "Personalization Campaign" },
      suggestedLabels: ["discipline:personalization"],
      suggestedDisciplines: ["Personalization Strategy"],
    },
    {
      id: "research-discovery",
      description: "Research/discovery requests route to UX research.",
      when: { requestType: "Research / Discovery" },
      suggestedLabels: ["discipline:research"],
      suggestedDisciplines: ["Research"],
    },
  ],

  // CORE tier — the minimum to file a clean ticket. Kept lean so less-experienced
  // stakeholders can finalize fast. Request Type stays here because Jira requires it.
  // businessContext is the single "Context" field (situation + problem + background);
  // targetImprovement is the plain-language "desired outcome"; primarySuccessMetric
  // is extrapolated from the desired outcome when the user doesn't supply one.
  requiredFields: [
    "submitterName",
    "submitterEmail",
    "briefTitle",
    "briefSummary",
    "lineOfBusiness",
    "journeySegment",
    "endUserPlatform",
    "requestType",
    "pageOrUrl",
    "targetAudience",
    "businessContext",
    "targetImprovement",
    "primarySuccessMetric",
    "desiredLaunchTiming",
  ],

  // SECONDARY tier — optional depth. Pursued only after core is complete and the
  // user opts to keep going. These never block submission.
  secondaryFields: [
    "supportingEvidence",
    "baselineMetrics",
    "secondarySuccessMetrics",
    "guardrailMetrics",
    "variationIdeas",
    "designResearchGuidance",
    "technicalDependencies",
    "openQuestions",
  ],

  metricLibrary: {
    primary: [
      "Conversion rate",
      "Click-through rate",
      "Form completion rate",
      "Add-to-cart rate",
      "Checkout completion rate",
      "Approval rate",
      "Activation rate",
      "Average order value",
      "Revenue per visitor",
    ],
    guardrail: [
      "Bounce rate",
      "Page load time",
      "Error rate",
      "Cart abandonment rate",
      "Support contact rate",
      "Refund / return rate",
      "Unsubscribe rate",
    ],
    byJourney: {
      Acquisition: ["Click-through rate", "Cost per acquisition", "Landing page conversion rate"],
      Conversion: ["Checkout completion rate", "Approval rate", "Add-to-cart rate"],
      Retention: ["Repeat purchase rate", "Churn rate", "Engagement rate"],
    },
  },

  labels: {
    base: ["intake-brief-builder"],
    platformPrefix: "platform:",
    needsManualReview: "needs-manual-review",
  },

  // Brand + program reference context injected into the LLM prompts. Seeded from
  // context-content.ts (fictional sample content); editable via /admin/config.
  brandContext: {
    "Online Store": ONLINE_STORE_CONTEXT,
    Marketplace: MARKETPLACE_CONTEXT,
    "Rewards App": REWARDS_APP_CONTEXT,
  },
  programContext: PROGRAM_CONTEXT,

  derived: {
    // Left empty by default to avoid guessing. Admin can enable, e.g.
    // { "Online Store": "<optionId>", Marketplace: "<optionId>" }.
    journeyPlatformByLob: {},
    // Category optionIds by request type (configured via JIRA_OPT_CATEGORY_*).
    categoryByRequestType: JIRA_OPTIONS.category,
  },
};
