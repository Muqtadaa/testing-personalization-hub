import { NextResponse } from "next/server";
import { reviewTickets, type ReviewItemInput } from "@/lib/roadmap/review/review";

// Ticket review agent endpoint. The backlog page calls this AFTER the roadmap
// renders, passing the early-pipeline items (key + updated + summary + brief +
// rice). RICE gaps are deterministic; brief quality is LLM-judged. Results are
// cached per (key, updated), so repeat syncs are cheap. Kept off the main
// /api/roadmap path so the board never blocks on LLM latency.

export const dynamic = "force-dynamic";
export const revalidate = 0;

function coerceItems(input: unknown): ReviewItemInput[] {
  if (!input || typeof input !== "object") return [];
  const items = (input as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object" && typeof (i as { key?: unknown }).key === "string")
    .map((i) => {
      const rice = (i.rice as Record<string, unknown> | undefined) ?? {};
      return {
        key: i.key as string,
        updated: typeof i.updated === "string" ? i.updated : null,
        summary: typeof i.summary === "string" ? i.summary : "",
        brief: typeof i.brief === "string" ? i.brief : null,
        rice: {
          reach: typeof rice.reach === "string" ? rice.reach : null,
          impact: typeof rice.impact === "string" ? rice.impact : null,
          effort: typeof rice.effort === "string" ? rice.effort : null,
        },
      };
    });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const items = coerceItems(body);
    const reviews = await reviewTickets(items);
    return NextResponse.json({ reviews, reviewedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[api/roadmap/review] error:", err);
    return NextResponse.json(
      { reviews: [], error: (err as Error).message },
      { status: 500 },
    );
  }
}
