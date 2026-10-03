import { NextResponse } from "next/server";
import { generateBrief } from "@/lib/intake/brief/generate";
import { getIntake, saveIntake } from "@/lib/intake/db/intakes";

// POST /api/brief/[id] — (re)generate the editable brief from collected fields.
// Body: { regenerate?: boolean }. By default we fill-if-empty (first generation,
// never clobber edits). With `regenerate: true` (the review page CTA after edits)
// we overwrite the title/summary/hypothesis with the freshly authored versions.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const record = await getIntake(id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

    let regenerate = false;
    try {
      const body = (await req.json()) as { regenerate?: boolean };
      regenerate = body.regenerate === true;
    } catch {
      // empty body — default first-generation behavior
    }

    // On regenerate, clear the prior summary/hypothesis first so the model (and the
    // deterministic fallback) re-author them from the latest fields instead of echoing.
    if (regenerate) {
      record.fields.briefSummary = null;
      record.fields.hypothesis = null;
    }

    const brief = await generateBrief(record);
    record.brief = brief;
    if (regenerate) {
      if (brief.title) record.fields.briefTitle = brief.title;
      if (brief.summary) record.fields.briefSummary = brief.summary;
      record.fields.hypothesis = brief.hypothesis || record.fields.hypothesis || null;
    } else {
      // Keep the generated title/summary/hypothesis in the structured fields too,
      // so the review page shows them as editable values (fill-if-empty).
      record.fields.briefTitle = record.fields.briefTitle || brief.title;
      record.fields.briefSummary = record.fields.briefSummary || brief.summary;
      record.fields.hypothesis = record.fields.hypothesis || brief.hypothesis || null;
    }
    await saveIntake(record);

    return NextResponse.json({ brief, intake: record });
  } catch (err) {
    console.error("[api/brief/:id] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
