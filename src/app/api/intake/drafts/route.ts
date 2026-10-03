import { NextResponse } from "next/server";
import { emailDomainAllowed } from "@/lib/intake/auth";
import { getConfig } from "@/lib/intake/config/service";
import { deleteIntake, listDraftsByEmail } from "@/lib/intake/db/intakes";

export const dynamic = "force-dynamic";

// GET /api/intake/drafts?email=… — list the user's saved drafts with core progress.
export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
    if (!emailDomainAllowed(email)) {
      return NextResponse.json({ error: "A valid work email is required." }, { status: 403 });
    }

    const [config, drafts] = await Promise.all([getConfig(), listDraftsByEmail(email)]);
    const core = config.requiredFields;
    const hasValue = (r: Record<string, unknown>, k: string) => {
      const v = r[k];
      return v != null && `${v}`.trim() !== "";
    };

    const items = drafts.map((d) => {
      const f = d.fields as unknown as Record<string, unknown>;
      const coreFilled = core.filter((k) => hasValue(f, k)).length;
      return {
        id: d.id,
        title: (d.fields.briefTitle ?? "").trim() || "Untitled intake",
        updatedAt: d.updatedAt,
        phase: d.phase,
        coreFilled,
        coreTotal: core.length,
        attachments: d.attachments.length,
      };
    });

    return NextResponse.json({ drafts: items });
  } catch (err) {
    console.error("[api/intake/drafts] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/intake/drafts?id=…&email=… — remove one of the user's own drafts.
// Scoped server-side to status="draft" + the owning email, so a submitted intake
// or someone else's draft can never be deleted.
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id")?.trim() ?? "";
    const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
    if (!emailDomainAllowed(email)) {
      return NextResponse.json({ error: "A valid work email is required." }, { status: 403 });
    }
    if (!id) {
      return NextResponse.json({ error: "A draft id is required." }, { status: 400 });
    }
    const deleted = await deleteIntake(id, { email });
    if (!deleted) {
      return NextResponse.json({ error: "Draft not found or not yours to delete." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/intake/drafts DELETE] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
