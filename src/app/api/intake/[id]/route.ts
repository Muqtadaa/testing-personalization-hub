import { NextResponse } from "next/server";
import { getConfig } from "@/lib/intake/config/service";
import { getIntake, saveIntake } from "@/lib/intake/db/intakes";
import { scoreRice } from "@/lib/intake/rice/score";
import { missingRequired } from "@/lib/intake/validation/required";
import type { GeneratedBrief, IntakeFields, RiceInputs } from "@/lib/intake/types";

export const dynamic = "force-dynamic";

// GET /api/intake/[id] — load a draft.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const record = await getIntake(id);
  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ intake: record });
}

// PATCH /api/intake/[id] — apply manual field/RICE edits from the review UI.
// Body: { fields?: Partial<IntakeFields>, rice?: Partial<RiceInputs> }
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const record = await getIntake(id);
    if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const body = (await req.json()) as {
      fields?: Partial<IntakeFields>;
      rice?: Partial<RiceInputs>;
      brief?: GeneratedBrief;
    };

    if (body.brief) record.brief = body.brief;
    if (body.fields) {
      for (const [k, v] of Object.entries(body.fields)) {
        if (k === "rice") continue;
        (record.fields as unknown as Record<string, unknown>)[k] = v;
      }
    }
    if (body.rice) {
      record.fields.rice = { ...record.fields.rice, ...body.rice };
    }

    const config = await getConfig();
    record.fields.rice = scoreRice(record.fields.rice, config.rice).rice;
    record.missingFields = missingRequired(record.fields, config);

    await saveIntake(record);
    return NextResponse.json({ intake: record });
  } catch (err) {
    console.error("[api/intake/:id PATCH] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
