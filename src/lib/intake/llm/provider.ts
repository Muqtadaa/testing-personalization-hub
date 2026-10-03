import type { AppConfig } from "@/lib/intake/config/schema";
import type {
  ChatMessage,
  FieldConfidences,
  GeneratedBrief,
  IntakeFields,
  IntakeMode,
  IntakePhase,
  RiceInputs,
  TurnQuestion,
} from "@/lib/intake/types";
import type { BriefGap, TicketReview } from "@/lib/roadmap/review/types";

// Pluggable LLM provider. The Anthropic implementation is the real one; a mock
// implementation keeps the full flow working without an API key.

export interface IntakeTurnInput {
  config: AppConfig;
  history: ChatMessage[];
  fields: IntakeFields;
  confidences: FieldConfidences;
  /** Currently-open assumptions, so the model can carry forward or prune them. */
  unresolvedAssumptions: string[];
  /** Which collection tier the conversation is in (core vs optional detail). */
  phase: IntakePhase;
  /** "create" (default) or "improve" an existing ticket. */
  mode?: IntakeMode;
  /** For improve mode: the gaps the conversation should focus on closing. */
  improveGaps?: TicketReview | null;
}

export interface IntakeTurnResult {
  /** Natural-language reply to show the user (questions, confirmations). */
  assistantMessage: string;
  /** Sparse field updates the model is confident enough to record. */
  extracted: Partial<Record<keyof Omit<IntakeFields, "rice">, string | null>>;
  /** Per-field confidence for any field the model touched. */
  confidences: FieldConfidences;
  /** Sparse RICE updates (numeric inputs + rationale). */
  riceUpdate: Partial<RiceInputs>;
  /** Things the model flagged as assumptions/unknowns (never invented data). */
  unresolvedAssumptions: string[];
  /** Structured questions to render as a guided card (batched to reduce turns). */
  questions: TurnQuestion[];
}

export interface BriefInput {
  config: AppConfig;
  fields: IntakeFields;
  rice: RiceInputs;
  routingNotes: string[];
  /** For the "improve" flow: the ticket's existing description (plain text). When
   *  present, the brief must MERGE — preserve all existing substance and only add
   *  or strengthen the collected fields — never drop content. */
  existingDescription?: string;
}

/** A screenshot supplied to vision ideation, as base64 + media type. */
export interface IdeationImage {
  base64: string;
  mediaType: string;
}

/** A context document fed to ideation. PDFs carry base64; CSV/text carry decoded text. */
export interface IdeationDocument {
  filename: string;
  mediaType: string;
  base64?: string;
  text?: string;
}

export interface IdeationInput {
  config: AppConfig;
  fields: IntakeFields;
  images: IdeationImage[];
  documents?: IdeationDocument[];
}

/** One suggested variation, including a self-contained lo-fi SVG wireframe. */
export interface IdeationVariation {
  name: string;
  description: string;
  rationale: string;
  /** Self-contained SVG wireframe rendered to a PNG mockup server-side. */
  svg: string;
}

export interface IdeationResult {
  /** Plain-language summary of what to test and why. */
  whatToTest: string;
  variations: IdeationVariation[];
}

/** A ticket's text, fed to the review agent to judge brief quality. */
export interface TicketReviewInput {
  config: AppConfig;
  summary: string;
  /** Plain-text description (ADF flattened by the normalizer), or null. */
  brief: string | null;
}

export interface TicketReviewResult {
  /** Minimum-brief elements judged absent or inadequate. */
  briefMissing: BriefGap[];
  /** briefMissing.length === 0 */
  briefAdequate: boolean;
  /** One-line rationale for the judgement. */
  rationale: string;
}

export interface LLMProvider {
  intakeTurn(input: IntakeTurnInput): Promise<IntakeTurnResult>;
  generateBrief(input: BriefInput): Promise<GeneratedBrief>;
  /** Analyzes uploaded screenshots and proposes variations + lo-fi wireframes. */
  ideateFromScreenshots(input: IdeationInput): Promise<IdeationResult>;
  /** Judges whether a ticket's description carries the minimum-quality brief
   *  (problem statement, hypothesis, variation ideas). Used by the review agent. */
  reviewTicket(input: TicketReviewInput): Promise<TicketReviewResult>;
  /** Identifies which implementation is active (for diagnostics/UI). */
  readonly kind: "anthropic" | "mock";
}
