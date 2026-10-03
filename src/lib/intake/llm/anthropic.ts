import Anthropic from "@anthropic-ai/sdk";
import type { GeneratedBrief, RiceInputs, TurnQuestion } from "@/lib/intake/types";
import type {
  BriefInput,
  IdeationInput,
  IdeationResult,
  IntakeTurnInput,
  IntakeTurnResult,
  LLMProvider,
  TicketReviewInput,
  TicketReviewResult,
} from "./provider";
import type { BriefGap } from "@/lib/roadmap/review/types";
import {
  INTAKE_FIELD_KEYS,
  buildBriefSystemPrompt,
  buildIdeationSystemPrompt,
  buildImproveFocusBlock,
  buildIntakeSystemPrompt,
  buildReviewSystemPrompt,
  buildTurnContext,
} from "./prompts";
import { FIELD_LABELS } from "@/lib/intake/client/labels";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const nullableString = { type: ["string", "null"] as const };
const nullableNumber = { type: ["number", "null"] as const };

function buildRecordTurnTool(): Anthropic.Tool {
  const extractedProps: Record<string, unknown> = {};
  const confidenceProps: Record<string, unknown> = {};
  for (const k of INTAKE_FIELD_KEYS) {
    extractedProps[k] = nullableString;
    confidenceProps[k] = { type: "string", enum: ["high", "medium", "low", "unknown"] };
  }
  return {
    name: "record_turn",
    description:
      "Record your reply to the user plus any structured fields you extracted this turn.",
    input_schema: {
      type: "object",
      properties: {
        assistant_message: { type: "string" },
        extracted: { type: "object", properties: extractedProps, additionalProperties: false },
        confidences: { type: "object", properties: confidenceProps, additionalProperties: false },
        rice: {
          type: "object",
          additionalProperties: false,
          properties: {
            reach: nullableNumber,
            reachRationale: nullableString,
            impact: nullableNumber,
            impactRationale: nullableString,
            confidence: nullableNumber,
            confidenceRationale: nullableString,
            effort: nullableNumber,
            effortRationale: nullableString,
          },
        },
        unresolved_assumptions: { type: "array", items: { type: "string" } },
        questions: {
          type: "array",
          description:
            "Batched questions to ask the user as a guided card. Empty when nothing is needed.",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              question: { type: "string" },
              multiSelect: { type: "boolean" },
              allowCustom: { type: "boolean" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    label: { type: "string" },
                    value: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["label", "value"],
                },
              },
            },
            required: ["id", "question", "options", "multiSelect", "allowCustom"],
          },
        },
      },
      required: ["assistant_message"],
    } as Anthropic.Tool.InputSchema,
  };
}

function buildEmitBriefTool(): Anthropic.Tool {
  return {
    name: "emit_brief",
    description: "Emit the structured brief with all required sections.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        hypothesis: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: { heading: { type: "string" }, body: { type: "string" } },
            required: ["heading", "body"],
          },
        },
      },
      required: ["title", "summary", "hypothesis", "sections"],
    } as Anthropic.Tool.InputSchema,
  };
}

function buildEmitIdeationTool(): Anthropic.Tool {
  return {
    name: "emit_ideation",
    description: "Emit test variation ideas, each with a self-contained lo-fi SVG wireframe.",
    input_schema: {
      type: "object",
      properties: {
        whatToTest: { type: "string" },
        variations: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              rationale: { type: "string" },
              svg: { type: "string" },
            },
            required: ["name", "description", "svg"],
          },
        },
      },
      required: ["whatToTest", "variations"],
    } as Anthropic.Tool.InputSchema,
  };
}

function buildEmitReviewTool(): Anthropic.Tool {
  return {
    name: "emit_review",
    description:
      "Emit your judgement of whether the ticket description carries each minimum-brief element.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        problemStatementPresent: { type: "boolean" },
        hypothesisPresent: { type: "boolean" },
        variationIdeasPresent: { type: "boolean" },
        rationale: { type: "string" },
      },
      required: [
        "problemStatementPresent",
        "hypothesisPresent",
        "variationIdeasPresent",
        "rationale",
      ],
    } as Anthropic.Tool.InputSchema,
  };
}

/** Compact context lines from the intake fields, for grounding the ideation. */
function ideationContext(fields: IdeationInput["fields"]): string {
  const keys = [
    "businessContext",
    "targetImprovement",
    "lineOfBusiness",
    "journeySegment",
    "endUserPlatform",
    "requestType",
    "pageOrUrl",
    "targetAudience",
    "primarySuccessMetric",
  ] as const;
  const lines = keys
    .map((k) => {
      const v = (fields as unknown as Record<string, unknown>)[k];
      return v && `${v}`.trim() ? `- ${FIELD_LABELS[k] ?? k}: ${v}` : "";
    })
    .filter(Boolean);
  return lines.length ? lines.join("\n") : "(no structured context yet)";
}

function extractToolInput<T>(res: Anthropic.Message, name: string): T {
  const block = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === name,
  );
  if (!block) throw new Error(`Model did not call required tool "${name}".`);
  return block.input as T;
}

export class AnthropicProvider implements LLMProvider {
  readonly kind = "anthropic" as const;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = DEFAULT_MODEL) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async intakeTurn(input: IntakeTurnInput): Promise<IntakeTurnResult> {
    let system = buildIntakeSystemPrompt(input.config, input.fields.lineOfBusiness, input.phase);
    if (input.mode === "improve") {
      // Scope the conversation to the review's gaps without mutating config.
      system = `${buildImproveFocusBlock(input.improveGaps)}\n\n${system}`;
    }
    const context = buildTurnContext(
      input.fields,
      input.confidences,
      input.unresolvedAssumptions,
      input.phase,
      input.config,
    );
    const messages: Anthropic.MessageParam[] = [
      ...input.history.map(
        (m): Anthropic.MessageParam => ({ role: m.role, content: m.content }),
      ),
    ];
    // Append the latest known-state context as a system-style nudge in the last user turn.
    messages.push({
      role: "user",
      content: `(intake state — for your reference, do not quote verbatim)\n${context}`,
    });

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: [buildRecordTurnTool()],
      tool_choice: { type: "tool", name: "record_turn" },
      messages,
    });

    const raw = extractToolInput<{
      assistant_message: string;
      extracted?: Record<string, string | null>;
      confidences?: Record<string, "high" | "medium" | "low" | "unknown">;
      rice?: Partial<RiceInputs>;
      unresolved_assumptions?: string[];
      questions?: TurnQuestion[];
    }>(res, "record_turn");

    const extracted: IntakeTurnResult["extracted"] = {};
    for (const k of INTAKE_FIELD_KEYS) {
      const v = raw.extracted?.[k];
      if (v !== undefined && v !== null && `${v}`.trim() !== "") {
        extracted[k] = v;
      }
    }

    return {
      assistantMessage: raw.assistant_message,
      extracted,
      confidences: (raw.confidences as IntakeTurnResult["confidences"]) ?? {},
      riceUpdate: raw.rice ?? {},
      unresolvedAssumptions: raw.unresolved_assumptions ?? [],
      questions: (raw.questions ?? []).filter((q) => q && q.question && q.options?.length),
    };
  }

  async generateBrief(input: BriefInput): Promise<GeneratedBrief> {
    const merge = !!input.existingDescription?.trim();
    const system = buildBriefSystemPrompt(input.config, input.fields.lineOfBusiness, { merge });
    const payload = {
      fields: input.fields,
      rice: input.rice,
      routingNotes: input.routingNotes,
    };
    const existingBlock = merge
      ? `\n\nCURRENT TICKET DESCRIPTION (preserve all substantive content from this — see IMPROVE MODE rules):\n"""\n${input.existingDescription}\n"""`
      : "";
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: [buildEmitBriefTool()],
      tool_choice: { type: "tool", name: "emit_brief" },
      messages: [
        {
          role: "user",
          content: `Generate the brief from this collected intake data (JSON). Use only what is present:\n\n${JSON.stringify(payload, null, 2)}${existingBlock}`,
        },
      ],
    });
    return extractToolInput<GeneratedBrief>(res, "emit_brief");
  }

  async ideateFromScreenshots(input: IdeationInput): Promise<IdeationResult> {
    const system = buildIdeationSystemPrompt(input.config, input.fields.lineOfBusiness);
    const imageBlocks: Anthropic.ContentBlockParam[] = input.images.map((img) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
        data: img.base64,
      },
    }));
    // Context documents: PDFs as document blocks; CSV/text inlined as text (capped).
    const docBlocks: Anthropic.ContentBlockParam[] = [];
    for (const d of input.documents ?? []) {
      if (d.base64 && d.mediaType === "application/pdf") {
        docBlocks.push({
          type: "document",
          title: d.filename,
          source: { type: "base64", media_type: "application/pdf", data: d.base64 },
        } as Anthropic.ContentBlockParam);
      } else if (d.text && d.text.trim()) {
        docBlocks.push({
          type: "text",
          text: `Attached data file "${d.filename}":\n\n${d.text.slice(0, 20000)}`,
        });
      }
    }
    const res = await this.client.messages.create({
      model: this.model,
      // SVG wireframes are token-heavy; give ample room so variations + their SVGs
      // are not truncated (which drops variations and yields zero mockups).
      max_tokens: 16000,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: [buildEmitIdeationTool()],
      tool_choice: { type: "tool", name: "emit_ideation" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Here ${input.images.length === 1 ? "is the screenshot" : "are the screenshots"} of the current UI${docBlocks.length ? ", plus supporting data/context files" : ""}. Intake context:\n\n${ideationContext(input.fields)}\n\nUse any attached data to ground your suggestions. Propose test variations and a lo-fi SVG wireframe for each.`,
            },
            ...imageBlocks,
            ...docBlocks,
          ],
        },
      ],
    });
    const raw = extractToolInput<IdeationResult>(res, "emit_ideation");
    return {
      whatToTest: raw.whatToTest ?? "",
      variations: (raw.variations ?? []).filter((v) => v && v.svg && v.name),
    };
  }

  async reviewTicket(input: TicketReviewInput): Promise<TicketReviewResult> {
    const system = buildReviewSystemPrompt(input.config);
    const body = (input.brief ?? "").trim() || "(the description is empty)";
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: [buildEmitReviewTool()],
      tool_choice: { type: "tool", name: "emit_review" },
      messages: [
        {
          role: "user",
          content: `Summary: ${input.summary || "(no summary)"}\n\nDescription:\n${body}`,
        },
      ],
    });
    const raw = extractToolInput<{
      problemStatementPresent: boolean;
      hypothesisPresent: boolean;
      variationIdeasPresent: boolean;
      rationale?: string;
    }>(res, "emit_review");
    const briefMissing: BriefGap[] = [];
    if (!raw.problemStatementPresent) briefMissing.push("problemStatement");
    if (!raw.hypothesisPresent) briefMissing.push("hypothesis");
    if (!raw.variationIdeasPresent) briefMissing.push("variationIdeas");
    return {
      briefMissing,
      briefAdequate: briefMissing.length === 0,
      rationale: (raw.rationale ?? "").trim(),
    };
  }
}
