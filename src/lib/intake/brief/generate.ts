import { getConfig } from "@/lib/intake/config/service";
import { getLLMProvider } from "@/lib/intake/llm";
import { computeRouting } from "@/lib/intake/routing";
import { scoreRice } from "@/lib/intake/rice/score";
import { stripEmoji } from "@/lib/intake/text";
import type { GeneratedBrief, IntakeRecord } from "@/lib/intake/types";
import { buildBriefSections, composeHypothesis, composeSummary } from "./sections";

function cleanBrief(b: GeneratedBrief): GeneratedBrief {
  return {
    title: stripEmoji(b.title),
    summary: stripEmoji(b.summary),
    hypothesis: b.hypothesis ? stripEmoji(b.hypothesis) : undefined,
    sections: b.sections.map((s) => ({
      heading: stripEmoji(s.heading),
      body: stripEmoji(s.body),
    })),
  };
}

// Generates an editable brief from collected fields. Tries the LLM; on any
// failure falls back to the deterministic section builder so the user always
// gets an editable brief.

/** Deterministic brief built directly from the (possibly edited) fields, so the
 *  review page is WYSIWYG and the Jira description always matches what the user
 *  sees. Title/summary come from the fields; the 14 other sections from values. */
export async function briefFromFields(record: IntakeRecord): Promise<GeneratedBrief> {
  const config = await getConfig();
  const rice = scoreRice(record.fields.rice, config.rice).rice;
  const routing = computeRouting(record.fields, config);
  return cleanBrief({
    title: record.fields.briefTitle || "Untitled intake",
    summary: composeSummary(record.fields),
    hypothesis: composeHypothesis(record.fields),
    sections: buildBriefSections({ ...record.fields, rice }, rice, routing.notes),
  });
}

/** Builds the deterministic brief, appending the original ticket description as a
 *  preserved section so nothing is ever lost when the LLM merge is unavailable. */
function deterministicImprovedBrief(
  record: IntakeRecord,
  rice: ReturnType<typeof scoreRice>["rice"],
  notes: string[],
  existingDescription: string,
): GeneratedBrief {
  const sections = buildBriefSections({ ...record.fields, rice }, rice, notes);
  const original = existingDescription.trim();
  if (original) {
    sections.push({
      heading: "Existing ticket details (preserved)",
      body: original,
    });
  }
  return cleanBrief({
    title: record.fields.briefTitle || "Untitled intake",
    summary: composeSummary(record.fields),
    hypothesis: composeHypothesis(record.fields),
    sections,
  });
}

/**
 * Brief for the "improve the brief" flow. MERGES the ticket's existing
 * description with the newly collected fields so original content (variation
 * ideas, context, links) is never dropped. The Anthropic provider does a true
 * merge; for the mock provider or on any LLM failure we fall back to the
 * deterministic builder WITH the original appended, so content is preserved
 * either way.
 */
export async function generateImprovedBrief(
  record: IntakeRecord,
  existingDescription: string,
): Promise<GeneratedBrief> {
  const config = await getConfig();
  const provider = getLLMProvider();
  const rice = scoreRice(record.fields.rice, config.rice).rice;
  const routing = computeRouting(record.fields, config);

  if (provider.kind === "anthropic") {
    try {
      const brief = await provider.generateBrief({
        config,
        fields: { ...record.fields, rice },
        rice,
        routingNotes: routing.notes,
        existingDescription,
      });
      if (brief?.sections?.length) return cleanBrief(brief);
    } catch (err) {
      console.error("[brief] improve merge failed, using deterministic fallback:", err);
    }
  }

  return deterministicImprovedBrief(record, rice, routing.notes, existingDescription);
}

export async function generateBrief(record: IntakeRecord): Promise<GeneratedBrief> {
  const config = await getConfig();
  const provider = getLLMProvider();
  const rice = scoreRice(record.fields.rice, config.rice).rice;
  const routing = computeRouting(record.fields, config);

  try {
    const brief = await provider.generateBrief({
      config,
      fields: { ...record.fields, rice },
      rice,
      routingNotes: routing.notes,
    });
    if (brief?.sections?.length) return cleanBrief(brief);
  } catch (err) {
    console.error("[brief] LLM generation failed, using deterministic fallback:", err);
  }

  return cleanBrief({
    title: record.fields.briefTitle || "Untitled intake",
    summary: composeSummary(record.fields),
    hypothesis: composeHypothesis(record.fields),
    sections: buildBriefSections({ ...record.fields, rice }, rice, routing.notes),
  });
}
