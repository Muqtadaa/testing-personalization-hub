import { NextResponse } from "next/server";
import { listVersions } from "@/lib/results/db/versions";

export const dynamic = "force-dynamic";

// GET /api/results/versions — version history metadata, newest first.
// (Never includes the dataset payload — that's megabytes per row.)
export async function GET() {
  try {
    const versions = await listVersions();
    return NextResponse.json({ versions });
  } catch (err) {
    console.error("[api/results/versions GET] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
