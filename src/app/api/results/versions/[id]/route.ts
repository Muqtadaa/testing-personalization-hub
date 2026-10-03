import { NextResponse } from "next/server";
import { deleteVersion, getVersionMeta, resultsReadOnly } from "@/lib/results/db/versions";
import { requireUserForMutation } from "@/lib/results/auth";
import { deleteBlob } from "@/lib/intake/storage/blob";

export const dynamic = "force-dynamic";

// GET /api/results/versions/[id] — a single version's metadata + parse stats.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const version = await getVersionMeta(id);
    if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });
    return NextResponse.json({ version });
  } catch (err) {
    console.error("[api/results/versions/:id GET] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE /api/results/versions/[id] — removes a NON-ACTIVE version and its
// raw files in Blob (best effort).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    const deleted = await deleteVersion(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Version not found, or it is the active version (activate another first)." },
        { status: 409 },
      );
    }
    if (deleted.workbookBlobPath) await deleteBlob(deleted.workbookBlobPath);
    if (deleted.sourceBlobPath) await deleteBlob(deleted.sourceBlobPath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/results/versions/:id DELETE] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
