// Canonical domain types shared across services.
// Intake field keys are the single source of truth that mappings, validation,
// extraction, and the brief all reference.

export type Confidence = "high" | "medium" | "low" | "unknown";

/** RICE inputs. Numeric values are produced from plain-language answers; rationale
 *  is preserved verbatim. `score` is computed by the RICE service, never invented. */
export interface RiceInputs {
  reach: number | null; // estimated users / sessions affected
  reachRationale: string | null;
  impact: number | null; // expected value of improving the target metric (scale from config)
  impactRationale: string | null;
  confidence: number | null; // 0..1 strength of evidence / measurement readiness
  confidenceRationale: string | null;
  effort: number | null; // expected cross-functional complexity (person-weeks or scale)
  effortRationale: string | null;
  score: number | null; // computed = (reach * impact * confidence) / effort
}

export function emptyRice(): RiceInputs {
  return {
    reach: null,
    reachRationale: null,
    impact: null,
    impactRationale: null,
    confidence: null,
    confidenceRationale: null,
    effort: null,
    effortRationale: null,
    score: null,
  };
}

/** Everything the intake collects. `null` means "not yet known" — never fabricated. */
export interface IntakeFields {
  submitterName: string | null;
  submitterEmail: string | null;
  submitterTeam: string | null;
  briefTitle: string | null;
  briefSummary: string | null;
  lineOfBusiness: string | null; // taxonomy value (display label)
  journeySegment: string | null;
  endUserPlatform: string | null;
  requestType: string | null;
  pageOrUrl: string | null;
  targetAudience: string | null;
  /** The single "Context" field: situation, friction/problem, and background. */
  businessContext: string | null;
  /** "By doing X we will impact Y because Z, leading to [desired outcome]." */
  hypothesis: string | null;
  /** Suggested variations / experiences / design directions (secondary tier). */
  variationIdeas: string | null;
  supportingEvidence: string | null;
  baselineMetrics: string | null;
  primarySuccessMetric: string | null;
  secondarySuccessMetrics: string | null;
  guardrailMetrics: string | null;
  targetImprovement: string | null;
  desiredLaunchTiming: string | null;
  resultsNeededBy: string | null; // ISO date (YYYY-MM-DD) when parseable
  designResearchGuidance: string | null;
  technicalDependencies: string | null;
  openQuestions: string | null;
  rice: RiceInputs;
}

export type IntakeFieldKey = keyof Omit<IntakeFields, "rice">;

export function emptyIntakeFields(): IntakeFields {
  return {
    submitterName: null,
    submitterEmail: null,
    submitterTeam: null,
    briefTitle: null,
    briefSummary: null,
    lineOfBusiness: null,
    journeySegment: null,
    endUserPlatform: null,
    requestType: null,
    pageOrUrl: null,
    targetAudience: null,
    businessContext: null,
    hypothesis: null,
    variationIdeas: null,
    supportingEvidence: null,
    baselineMetrics: null,
    primarySuccessMetric: null,
    secondarySuccessMetrics: null,
    guardrailMetrics: null,
    targetImprovement: null,
    desiredLaunchTiming: null,
    resultsNeededBy: null,
    designResearchGuidance: null,
    technicalDependencies: null,
    openQuestions: null,
    rice: emptyRice(),
  };
}

export type FieldConfidences = Partial<Record<IntakeFieldKey, Confidence>>;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  at?: string;
}

/** A guided, Plan-Mode-style question the assistant asks. The UI renders options
 *  as selectable chips (single or multi) plus a free-text "Other" input. */
export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}
export interface TurnQuestion {
  /** Stable id — ideally the intake field key this resolves (e.g. "journeySegment"). */
  id: string;
  question: string;
  options: QuestionOption[];
  multiSelect: boolean;
  allowCustom: boolean;
}

/** One section of the generated brief. */
export interface BriefSection {
  heading: string;
  body: string; // plain text / lightweight markdown
}

export interface GeneratedBrief {
  title: string;
  summary: string;
  /** Concise hypothesis: "By doing X, we will impact Y, because Z, leading to [outcome]." */
  hypothesis?: string;
  sections: BriefSection[];
}

export type IntakeStatus = "draft" | "submitted";

/** Which collection tier the conversation is in. "core" gathers the minimum to
 *  finalize; "detail" pursues the optional secondary fields. */
export type IntakePhase = "core" | "detail";

/** An uploaded screenshot, an uploaded context document (PDF/CSV/text), or a
 *  generated lo-fi mockup, persisted to Vercel Blob. */
export interface IntakeAttachment {
  id: string;
  kind: "screenshot" | "mockup" | "document";
  /** Blob pathname (the canonical reference; reads are proxied server-side). */
  blobPath: string;
  filename: string;
  contentType: string;
  width?: number;
  height?: number;
  /** For mockups: the variation name / short caption. */
  caption?: string;
}

/** Whether a record is a fresh intake ("create") or improves an existing Jira
 *  ticket ("improve" — seeded from the ticket, finalized via a Jira update). */
export type IntakeMode = "create" | "improve";

export interface IntakeRecord {
  id: string;
  status: IntakeStatus;
  /** Collection tier; defaults to "core". */
  phase: IntakePhase;
  /** "create" (default) or "improve" an existing ticket. */
  mode?: IntakeMode;
  /** For improve mode: the review snapshot that triggered this, so the
   *  conversation can focus on exactly the gaps found. */
  improveGaps?: import("@/lib/roadmap/review/types").TicketReview | null;
  fields: IntakeFields;
  confidences: FieldConfidences;
  messages: ChatMessage[];
  brief: GeneratedBrief | null;
  missingFields: string[];
  unresolvedAssumptions: string[];
  /** Structured questions awaiting the user's answer (rendered as a guided card). */
  pendingQuestions: TurnQuestion[];
  /** Uploaded screenshots + generated mockups. */
  attachments: IntakeAttachment[];
  jiraIssueKey: string | null;
  jiraUrl: string | null;
  dryRun: boolean;
  createdAt: string;
  updatedAt: string;
}
