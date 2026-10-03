import { NextResponse } from "next/server";
import { getIntake } from "@/lib/intake/db/intakes";
import { hasJiraCreds } from "@/lib/intake/jira/client";
import { updateIntakeIssue } from "@/lib/intake/jira/update";

// POST /api/intake/jira/update/[id] — dry-run (default) or real PUT to the
// existing Jira ticket the record was seeded from (the "improve the brief"
// flow). Body: { dryRun?: boolean } (omit to use the server default JIRA_DRY_RUN).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    // Snapshot mode — no Jira to write back to on the public deploy.
    if (!hasJiraCreds()) {
      return NextResponse.json(
        { error: "Updating Jira tickets is disabled in this public snapshot." },
        { status: 503 },
      );
    }
    const { id } = await ctx.params;
    const record = await getIntake(id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!record.jiraIssueKey) {
      return NextResponse.json(
        { error: "This intake is not linked to a Jira ticket." },
        { status: 422 },
      );
    }

    let dryRunOverride: boolean | undefined;
    try {
      const body = (await req.json()) as { dryRun?: boolean };
      if (typeof body.dryRun === "boolean") dryRunOverride = body.dryRun;
    } catch {
      // empty body is fine
    }

    const result = await updateIntakeIssue(record, { dryRunOverride });
    return NextResponse.json({ result });
  } catch (err) {
    console.error("[api/intake/jira/update/:id] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
