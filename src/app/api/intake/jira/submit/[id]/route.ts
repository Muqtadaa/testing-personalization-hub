import { NextResponse } from "next/server";
import { getIntake } from "@/lib/intake/db/intakes";
import { hasJiraCreds } from "@/lib/intake/jira/client";
import { submitIntake } from "@/lib/intake/jira/submit";

// POST /api/jira/submit/[id] — dry-run (default) or real create + transition to Intake.
// Body: { dryRun?: boolean }  (omit to use the server default JIRA_DRY_RUN)
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Snapshot mode — no Jira to write to on the public deploy. The brief still
    // generates; only the final "submit to Jira" hand-off is disabled.
    if (!hasJiraCreds()) {
      return NextResponse.json(
        { error: "Submitting to Jira is disabled in this public snapshot." },
        { status: 503 },
      );
    }
    const { id } = await ctx.params;
    const record = await getIntake(id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

    let dryRunOverride: boolean | undefined;
    try {
      const body = (await req.json()) as { dryRun?: boolean };
      if (typeof body.dryRun === "boolean") dryRunOverride = body.dryRun;
    } catch {
      // empty body is fine
    }

    const result = await submitIntake(record, { dryRunOverride });
    const status = result.blocked ? 422 : 200;
    return NextResponse.json({ result }, { status });
  } catch (err) {
    console.error("[api/jira/submit/:id] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
