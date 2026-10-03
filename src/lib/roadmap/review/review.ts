import { getConfig } from "@/lib/intake/config/service";
import { getLLMProvider } from "@/lib/intake/llm";
import { getReviews, saveReviews } from "./cache";
import {
  BRIEF_GAP_LABELS,
  RICE_GAP_LABELS,
  type RiceGap,
  type TicketReview,
} from "./types";

// Ticket review orchestrator. For each early-pipeline ticket:
//   - RICE gaps are computed deterministically from the normalized select values
//     (no LLM): reach/impact/effort that are unset.
//   - Brief quality is judged by the LLM provider over the plain-text description
//     (the 8KB brief the normalizer already extracted — no second Jira fetch).
// Results are cached against the ticket's `updated`; only stale/missing tickets
// are (re)computed, and the LLM fan-out is bounded so a first sync of many
// uncached tickets does not flood the API.

const CONCURRENCY = 4;

/** Minimal item shape the review needs; RoadmapItem satisfies it structurally. */
export interface ReviewItemInput {
  key: string;
  updated: string | null;
  summary: string;
  brief: string | null;
  rice: { reach: string | null; impact: string | null; effort: string | null };
}

const RICE_DIMS: RiceGap[] = ["reach", "impact", "effort"];

function riceMissingFor(item: ReviewItemInput): RiceGap[] {
  return RICE_DIMS.filter((dim) => {
    const v = item.rice?.[dim];
    return v == null || `${v}`.trim() === "";
  });
}

function composeSummary(riceMissing: RiceGap[], briefMissing: TicketReview["briefMissing"]): string | null {
  const parts: string[] = [];
  if (riceMissing.length) {
    parts.push(`Missing RICE: ${riceMissing.map((d) => RICE_GAP_LABELS[d]).join(", ")}`);
  }
  if (briefMissing.length) {
    parts.push(`Brief gaps: ${briefMissing.map((g) => BRIEF_GAP_LABELS[g]).join(", ")}`);
  }
  return parts.length ? parts.join(". ") : null;
}

/** Map over items with a bounded number of concurrent workers. */
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Whether the brief gaps (the expensive LLM judgment) need (re)computing.
 *  Delta policy, to keep subsequent syncs cheap:
 *   - No prior review        -> judge (a new ticket).
 *   - Prior brief was solid  -> never re-judge. A brief deemed adequate stays
 *                               trusted; we don't burn an LLM call on it again.
 *   - Prior brief had gaps   -> re-judge only when the ticket changed
 *                               (`updated` moved), to catch a fix. Unchanged ->
 *                               reuse the stale gaps. */
function needsBriefJudgment(prior: TicketReview | undefined, item: ReviewItemInput): boolean {
  if (!prior) return true;
  if (prior.briefAdequate) return false;
  return prior.updated !== (item.updated ?? "");
}

export async function reviewTickets(items: ReviewItemInput[]): Promise<TicketReview[]> {
  if (!items.length) return [];
  const config = await getConfig();
  const provider = getLLMProvider();

  const keys = items.map((i) => i.key);
  const cached = await getReviews(keys);
  const reviewedAt = new Date().toISOString();

  // RICE is recomputed for every ticket (deterministic, no cost). Only the brief
  // judgment is gated by the delta policy above, so the LLM runs on new and
  // newly-changed-but-still-weak tickets only.
  const reviews = await mapPool(items, CONCURRENCY, async (item): Promise<TicketReview> => {
    const prior = cached.get(item.key);
    const riceMissing = riceMissingFor(item);

    let briefMissing: TicketReview["briefMissing"];
    let llmKind: TicketReview["llmKind"];
    if (needsBriefJudgment(prior, item)) {
      try {
        const judged = await provider.reviewTicket({
          config,
          summary: item.summary,
          brief: item.brief,
        });
        briefMissing = judged.briefMissing;
        llmKind = provider.kind;
      } catch (err) {
        // On LLM failure, do not block the sync — keep any prior judgment, else
        // treat the brief as adequate (RICE gaps still surface).
        console.error(`[review] reviewTicket failed for ${item.key}:`, (err as Error).message);
        briefMissing = prior?.briefMissing ?? [];
        llmKind = prior?.llmKind ?? provider.kind;
      }
    } else {
      briefMissing = prior?.briefMissing ?? [];
      llmKind = prior?.llmKind ?? provider.kind;
    }

    const briefAdequate = briefMissing.length === 0;
    const flagged = riceMissing.length > 0 || !briefAdequate;
    return {
      key: item.key,
      updated: item.updated ?? "",
      riceMissing,
      briefMissing,
      briefAdequate,
      flagged,
      summary: composeSummary(riceMissing, briefMissing),
      reviewedAt,
      llmKind,
    };
  });

  // Persist only what actually changed (keeps the table churn-free on no-op syncs).
  const changed = reviews.filter((r) => {
    const prior = cached.get(r.key);
    return (
      !prior ||
      prior.flagged !== r.flagged ||
      prior.updated !== r.updated ||
      prior.briefMissing.join(",") !== r.briefMissing.join(",") ||
      prior.riceMissing.join(",") !== r.riceMissing.join(",")
    );
  });
  if (changed.length) await saveReviews(changed);
  return reviews;
}
