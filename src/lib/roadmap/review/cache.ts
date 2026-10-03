import { getSupabase } from "@/lib/intake/db/client";
import type { TicketReview } from "./types";

// Cache for ticket reviews. Uses the Supabase `ticket_reviews` table when
// configured; otherwise an in-process Map (sufficient for local dev, where the
// Next dev server is a single long-lived process). Mirrors the pattern in
// `intake/db/intakes.ts`. A stored review is only a HIT when its `updated`
// matches the live item's `updated` — any Jira edit bumps `updated` and so
// invalidates the cache automatically; callers compare before trusting a row.

const TABLE = "ticket_reviews";
const mem = new Map<string, TicketReview>();

function rowToReview(row: Record<string, unknown>): TicketReview {
  return {
    key: row.key as string,
    updated: (row.updated as string) ?? "",
    riceMissing: (row.rice_missing as TicketReview["riceMissing"]) ?? [],
    briefMissing: (row.brief_missing as TicketReview["briefMissing"]) ?? [],
    briefAdequate: (row.brief_adequate as boolean) ?? false,
    flagged: (row.flagged as boolean) ?? false,
    summary: (row.summary as string) ?? null,
    reviewedAt: (row.reviewed_at as string) ?? "",
    llmKind: (row.llm_kind as TicketReview["llmKind"]) ?? "mock",
  };
}

function reviewToRow(r: TicketReview): Record<string, unknown> {
  return {
    key: r.key,
    updated: r.updated,
    rice_missing: r.riceMissing,
    brief_missing: r.briefMissing,
    brief_adequate: r.briefAdequate,
    flagged: r.flagged,
    summary: r.summary,
    reviewed_at: r.reviewedAt,
    llm_kind: r.llmKind,
  };
}

/** Fetch cached reviews for the given keys, by key (caller checks `updated`). */
export async function getReviews(keys: string[]): Promise<Map<string, TicketReview>> {
  const out = new Map<string, TicketReview>();
  if (!keys.length) return out;
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from(TABLE).select("*").in("key", keys);
    if (error) {
      // Table may not exist yet (migration unapplied): degrade to no cache hits.
      if (/relation|does not exist|schema cache|table/i.test(error.message)) return out;
      throw new Error(`getReviews failed: ${error.message}`);
    }
    for (const row of data ?? []) {
      const review = rowToReview(row);
      out.set(review.key, review);
    }
    return out;
  }
  for (const k of keys) {
    const r = mem.get(k);
    if (r) out.set(k, r);
  }
  return out;
}

/** Upsert computed reviews. */
export async function saveReviews(reviews: TicketReview[]): Promise<void> {
  if (!reviews.length) return;
  const db = getSupabase();
  if (db) {
    const { error } = await db.from(TABLE).upsert(reviews.map(reviewToRow));
    if (error) {
      // Missing table → keep working without persistence (in-memory fallback).
      if (/relation|does not exist|schema cache|table/i.test(error.message)) {
        for (const r of reviews) mem.set(r.key, r);
        return;
      }
      throw new Error(`saveReviews failed: ${error.message}`);
    }
    return;
  }
  for (const r of reviews) mem.set(r.key, r);
}

/** Drop a cached review so the next sync recomputes it (used post-improve). */
export async function invalidateReview(key: string): Promise<void> {
  const db = getSupabase();
  if (db) {
    const { error } = await db.from(TABLE).delete().eq("key", key);
    if (error && !/relation|does not exist|schema cache|table/i.test(error.message)) {
      throw new Error(`invalidateReview failed: ${error.message}`);
    }
  }
  mem.delete(key);
}
