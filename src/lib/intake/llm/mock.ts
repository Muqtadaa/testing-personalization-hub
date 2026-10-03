import type { GeneratedBrief } from "@/lib/intake/types";
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
import { INTAKE_FIELD_KEYS } from "./prompts";
import { buildBriefSections, composeHypothesis, composeSummary } from "@/lib/intake/brief/sections";

// Deterministic fallback provider used when ANTHROPIC_API_KEY is absent. It does
// light keyword extraction and asks for the next missing required field. It never
// invents data — unknown stays unknown.

const QUESTIONS: Record<string, string> = {
  submitterName: "First, what's your name?",
  submitterEmail: "What's your email address?",
  lineOfBusiness: "Which line of business is this for — Online Store, Marketplace, or Rewards App?",
  journeySegment: "Which journey does this affect — Acquisition, Conversion, or Retention?",
  endUserPlatform:
    "Who is the end user — Customer, Associate, Partner, or is it multi-platform?",
  requestType:
    "Is this an A/B test (Optimization), a Personalization campaign, Research/Discovery, or a Workshop?",
  pageOrUrl: "Which page, flow, surface, or URL does this involve?",
  targetAudience: "Who is the target audience, and what are the eligibility rules?",
  businessContext:
    "Give me the context: the situation, the problem or friction the audience hits, and any relevant background.",
  targetImprovement:
    "What's the desired outcome — what would success look like in plain language?",
  primarySuccessMetric:
    "What's the single primary success metric? (If unsure, I can suggest one from your desired outcome.)",
  guardrailMetrics: "What guardrail metric(s) must not get worse?",
  desiredLaunchTiming: "When would you like this to launch, and by when do you need results?",
  briefTitle: "What's a short title for this brief?",
  briefSummary: "Give me a one-paragraph summary and I'll draft the brief.",
};

export class MockProvider implements LLMProvider {
  readonly kind = "mock" as const;

  async intakeTurn(input: IntakeTurnInput): Promise<IntakeTurnResult> {
    const last = [...input.history].reverse().find((m) => m.role === "user")?.content ?? "";
    const extracted: IntakeTurnResult["extracted"] = {};
    const confidences: IntakeTurnResult["confidences"] = {};

    // Improve mode: drive the conversation off the flagged gaps only.
    if (input.mode === "improve") {
      const text = last.trim();
      const f = input.fields;
      const briefGaps = input.improveGaps?.briefMissing ?? [];
      const riceGaps = input.improveGaps?.riceMissing ?? [];
      const gapPrompts: { id: string; q: string; filled: boolean; apply: () => void }[] = [];
      if (briefGaps.includes("problemStatement"))
        gapPrompts.push({ id: "businessContext", q: "What's the core problem or friction this ticket addresses, and for whom?", filled: !!f.businessContext, apply: () => { extracted.businessContext = text; } });
      if (briefGaps.includes("hypothesis"))
        gapPrompts.push({ id: "hypothesis", q: "What's the hypothesis — what change do you expect to move which metric, and why?", filled: !!f.hypothesis, apply: () => { extracted.hypothesis = text; } });
      if (briefGaps.includes("variationIdeas"))
        gapPrompts.push({ id: "variationIdeas", q: "What are one or two concrete variation ideas to test?", filled: !!f.variationIdeas, apply: () => { extracted.variationIdeas = text; } });
      for (const dim of riceGaps)
        gapPrompts.push({ id: `rice.${dim}`, q: `On a 1-10 scale, how would you rate ${dim}? Add a one-line reason.`, filled: f.rice[dim] != null, apply: () => {} });

      // Apply the user's answer to the first not-yet-filled gap that was just asked.
      const pending = gapPrompts.find((g) => !g.filled);
      if (pending && text) pending.apply();
      const stillOpen = gapPrompts.filter((g) => !g.filled && g !== pending);
      const next = stillOpen[0] ?? gapPrompts.find((g) => !g.filled && !text);
      const assistantMessage = next
        ? `${text ? "Got it. " : ""}${next.q}`
        : "Thanks — that covers the flagged gaps. You can update the ticket whenever you're ready.";
      return {
        assistantMessage,
        extracted,
        confidences,
        riceUpdate: {},
        unresolvedAssumptions: [],
        questions: [],
      };
    }

    const email = last.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
    if (email && !input.fields.submitterEmail) {
      extracted.submitterEmail = email;
      confidences.submitterEmail = "high";
    }
    // crude taxonomy keyword detection
    const lc = last.toLowerCase();
    const match = (opts: string[]) => opts.find((o) => lc.includes(o.toLowerCase().split(" ")[0]));
    if (!input.fields.lineOfBusiness) {
      const lob = match(input.config.taxonomy.lineOfBusiness);
      if (lob) {
        extracted.lineOfBusiness = lob;
        confidences.lineOfBusiness = "medium";
      }
    }
    if (!input.fields.requestType) {
      if (lc.includes("a/b") || lc.includes("ab test") || lc.includes("optimiz")) {
        extracted.requestType = "Optimization / A/B Test";
        confidences.requestType = "medium";
      } else if (lc.includes("personali")) {
        extracted.requestType = "Personalization Campaign";
        confidences.requestType = "medium";
      }
    }

    // find next missing required field to ask about
    const merged = { ...input.fields, ...extracted };
    const nextKey = input.config.requiredFields.find(
      (k) =>
        (INTAKE_FIELD_KEYS as string[]).includes(k) &&
        !((merged as Record<string, unknown>)[k] ?? "").toString().trim(),
    );
    const assistantMessage = nextKey
      ? `${Object.keys(extracted).length ? "Got it. " : "Thanks. "}${QUESTIONS[nextKey] ?? `Can you tell me about ${nextKey}?`}`
      : "I have everything required. You can generate the brief whenever you're ready.";

    // Surface the next classification field as a guided question when applicable.
    const questions = [] as IntakeTurnResult["questions"];
    const taxFor: Record<string, string[]> = {
      lineOfBusiness: input.config.taxonomy.lineOfBusiness,
      journeySegment: input.config.taxonomy.journeySegment,
      endUserPlatform: input.config.taxonomy.endUserPlatform,
      requestType: input.config.taxonomy.requestType,
    };
    if (nextKey && taxFor[nextKey]) {
      questions.push({
        id: nextKey,
        question: QUESTIONS[nextKey] ?? `Choose ${nextKey}`,
        options: taxFor[nextKey].map((v) => ({ label: v, value: v })),
        multiSelect: false,
        allowCustom: true,
      });
    }

    return {
      assistantMessage,
      extracted,
      confidences,
      riceUpdate: {},
      unresolvedAssumptions: [],
      questions,
    };
  }

  async generateBrief(input: BriefInput): Promise<GeneratedBrief> {
    const sections = buildBriefSections(input.fields, input.rice, input.routingNotes);
    return {
      title: input.fields.briefTitle || "Untitled intake",
      summary: composeSummary(input.fields),
      hypothesis: composeHypothesis(input.fields),
      sections,
    };
  }

  async reviewTicket(input: TicketReviewInput): Promise<TicketReviewResult> {
    // Heuristic stand-in for the LLM judge: keyword + length signals so the flag
    // flow works end-to-end without an API key. Conservative — thin tickets flag.
    const text = `${input.summary} ${input.brief ?? ""}`.toLowerCase();
    const has = (...words: string[]) => words.some((w) => text.includes(w));
    const briefMissing: BriefGap[] = [];
    // Problem statement: needs some substance plus problem/friction language.
    if ((input.brief ?? "").trim().length < 120 || !has("problem", "friction", "pain", "because", "issue", "struggl"))
      briefMissing.push("problemStatement");
    if (!has("hypothes", "by doing", "we will", "we believe", "expect")) briefMissing.push("hypothesis");
    if (!has("variation", "variant", "test ", "we could", "idea", "try ", "experiment")) briefMissing.push("variationIdeas");
    const rationale = briefMissing.length
      ? `Mock review: likely missing ${briefMissing.join(", ")}.`
      : "Mock review: brief looks adequate.";
    return { briefMissing, briefAdequate: briefMissing.length === 0, rationale };
  }

  async ideateFromScreenshots(_input: IdeationInput): Promise<IdeationResult> {
    // No vision without an API key — return one placeholder wireframe so the
    // end-to-end flow (render + attach) still works in local/dev.
    const wire = (label: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 720">` +
      `<rect width="1024" height="720" fill="#f3f4f6"/>` +
      `<rect x="64" y="64" width="896" height="80" fill="#e5e7eb" stroke="#9ca3af"/>` +
      `<text x="80" y="112" font-family="sans-serif" font-size="28" fill="#374151">${label}</text>` +
      `<rect x="64" y="184" width="560" height="320" fill="#e5e7eb" stroke="#9ca3af"/>` +
      `<rect x="664" y="184" width="296" height="120" fill="#e5e7eb" stroke="#9ca3af"/>` +
      `<rect x="664" y="328" width="296" height="56" fill="#9ca3af"/>` +
      `<text x="700" y="364" font-family="sans-serif" font-size="22" fill="#ffffff">CTA</text>` +
      `</svg>`;
    return {
      whatToTest:
        "Mock ideation (no ANTHROPIC_API_KEY set). With a real key, this analyzes your screenshots and proposes grounded variations.",
      variations: [
        {
          name: "Simplified layout",
          description: "Tighten the hierarchy and make the primary CTA more prominent.",
          rationale: "Clearer hierarchy typically improves task completion.",
          svg: wire("Variation A — simplified"),
        },
      ],
    };
  }
}
