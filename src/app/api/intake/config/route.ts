import { NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/intake/config/service";
import { AppConfigSchema } from "@/lib/intake/config/schema";
import { isDbConfigured } from "@/lib/intake/db/client";
import { hasJiraCreds } from "@/lib/intake/jira/client";

export const dynamic = "force-dynamic";

function environment() {
  return {
    dbConfigured: isDbConfigured(),
    jiraConfigured: hasJiraCreds(),
    llmKind: process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock",
    dryRunDefault: process.env.JIRA_DRY_RUN !== "false",
  };
}

// GET /api/config — current config + environment status flags (for admin + UI banners).
export async function GET() {
  const config = await getConfig(true);
  return NextResponse.json({ config, env: environment() });
}

// PUT /api/config — save edited config (admin).
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const parsed = AppConfigSchema.parse(body.config ?? body);
    const saved = await saveConfig(parsed);
    return NextResponse.json({ config: saved, env: environment() });
  } catch (err) {
    console.error("[api/config PUT] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
