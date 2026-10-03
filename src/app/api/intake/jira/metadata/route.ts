import { NextResponse } from "next/server";
import { getConfig } from "@/lib/intake/config/service";
import { hasJiraCreds } from "@/lib/intake/jira/client";
import { refreshMetadataSnapshot } from "@/lib/intake/jira/discovery";

// POST /api/jira/metadata — refresh the live field metadata snapshot for the
// configured project/issue type so admins can verify the mapping & detect drift.
export async function POST() {
  try {
    if (!hasJiraCreds()) {
      return NextResponse.json(
        { error: "Jira credentials are not configured (JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN)." },
        { status: 400 },
      );
    }
    const config = await getConfig();
    const fields = await refreshMetadataSnapshot(config.jira);
    return NextResponse.json({ fields });
  } catch (err) {
    console.error("[api/jira/metadata] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
