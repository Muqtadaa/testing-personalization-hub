import { NextResponse } from "next/server";
import { activateVersion, resultsReadOnly } from "@/lib/results/db/versions";
import { requireUserForMutation } from "@/lib/results/auth";

export const dynamic = "force-dynamic";

// POST /api/results/versions/[id]/activate — makes this version the one every
// page reads. Activating an older version is the rollback path.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (resultsReadOnly()) {
      return NextResponse.json(
        { error: "This is a read-only public snapshot." },
        { status: 403 },
      );
    }
    const auth = await requireUserForMutation();
    if (!auth.ok) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const { id } = await ctx.params;
    const version = await activateVersion(id);
    if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });
    return NextResponse.json({ version });
  } catch (err) {
    console.error("[api/results/versions/:id/activate POST] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
