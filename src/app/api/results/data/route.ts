import { NextResponse } from "next/server";
import { getActiveDataset, getVersionDataset, getVersionMeta } from "@/lib/results/db/versions";

export const dynamic = "force-dynamic";

// GET /api/results/data — the active dataset (or `?version=<id>` to preview a
// specific version). Payload is the full normalized ResultsDataset (~1–3MB);
// the client provider fetches it once per page session.
export async function GET(req: Request) {
  try {
    const versionId = new URL(req.url).searchParams.get("version");
    if (versionId) {
      const [dataset, meta] = await Promise.all([
        getVersionDataset(versionId),
        getVersionMeta(versionId),
      ]);
      if (!dataset || !meta) {
        return NextResponse.json({ error: "Version not found." }, { status: 404 });
      }
      return NextResponse.json(
        { meta, dataset },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const active = await getActiveDataset();
    if (!active) {
      return NextResponse.json(
        { meta: null, dataset: null },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    return NextResponse.json(active, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("[api/results/data GET] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
