import { NextResponse } from "next/server";
import { JIRA_FIELDS, JIRA_RANK_CF_NUMBER } from "@/lib/intake/config/jira-env";
import { getConfig } from "@/lib/intake/config/service";
import type { AppConfig } from "@/lib/intake/config/schema";
import {
  JiraApiError,
  getJiraCreds,
  hasJiraCreds,
  searchAllIssues,
  type JiraCreds,
} from "@/lib/intake/jira/client";
import { normalizeIssues } from "@/lib/roadmap/normalize";
import roadmapSnapshot from "@/data/snapshot/roadmap.json";

// Live roadmap feed. Reads straight from Jira on every request (no caching)
// so a page load / Sync always reflects the board. The active Intake→Live
// pipeline loads in full; Done/Closed + Blocked load within a recent window that
// the client widens via "Load more" (?part=terminal&days=N).
//
// SNAPSHOT MODE: when no Jira credentials are present (the public personal
// deploy), this serves a frozen export bundled at build time instead of going
// blank. The data is read-only — "Sync" just re-reads the same snapshot.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_TERMINAL_DAYS = 30;
const MAX_TERMINAL_DAYS = 365;

const BASE_FIELDS = [
  "summary",
  "status",
  "issuetype",
  "priority",
  "assignee",
  "labels",
  "created",
  "updated",
  "statuscategorychangedate",
  "duedate",
  "resolutiondate",
];

function customFieldIds(config: AppConfig): string[] {
  const byIntake: Record<string, string> = {};
  for (const m of config.fieldMappings) byIntake[m.intakeField] = m.jiraFieldId;
  return [
    byIntake["lineOfBusiness"] ?? JIRA_FIELDS.lineOfBusiness,
    byIntake["journeySegment"] ?? JIRA_FIELDS.journey,
    byIntake["requestType"] ?? JIRA_FIELDS.requestType,
    byIntake["rice.reach"] ?? JIRA_FIELDS.riceReach,
    byIntake["rice.impact"] ?? JIRA_FIELDS.riceImpact,
    byIntake["rice.effort"] ?? JIRA_FIELDS.riceEffort,
    JIRA_FIELDS.rank, // board rank (LexoRank)
  ];
}

function buildFields(config: AppConfig, withDescription: boolean): string[] {
  const fields = [...BASE_FIELDS, ...customFieldIds(config)];
  if (withDescription) fields.push("description");
  return fields;
}

// Pulls an active-pipeline query ordered by board rank, falling back to created
// order if this instance rejects rank ordering.
async function pullRanked(creds: JiraCreds, baseJql: string, fields: string[]) {
  try {
    return await searchAllIssues(creds, { jql: `${baseJql} ORDER BY cf[${JIRA_RANK_CF_NUMBER}] ASC`, fields });
  } catch (err) {
    if (err instanceof JiraApiError) {
      return await searchAllIssues(creds, { jql: `${baseJql} ORDER BY created ASC`, fields });
    }
    throw err;
  }
}

export async function GET(request: Request) {
  if (!hasJiraCreds()) {
    // Snapshot mode — serve the frozen export. The "terminal" load-more path
    // already has the full window baked in, so return it whole regardless of days.
    const part = new URL(request.url).searchParams.get("part");
    const snap = roadmapSnapshot as {
      active?: unknown[];
      terminal?: unknown[];
      fetchedAt?: string | null;
    };
    if (part === "terminal") {
      return NextResponse.json({
        configured: true,
        terminal: snap.terminal ?? [],
        terminalDays: MAX_TERMINAL_DAYS,
        fetchedAt: snap.fetchedAt ?? null,
      });
    }
    return NextResponse.json({
      configured: true,
      active: snap.active ?? [],
      terminal: snap.terminal ?? [],
      terminalDays: MAX_TERMINAL_DAYS,
      fetchedAt: snap.fetchedAt ?? null,
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const part = searchParams.get("part");
    const days = Math.max(
      1,
      Math.min(MAX_TERMINAL_DAYS, Number(searchParams.get("days")) || DEFAULT_TERMINAL_DAYS),
    );

    const config = await getConfig();
    const creds = getJiraCreds();
    const project = config.jira.projectKey;
    const baseUrl = creds.baseUrl;
    const notSub = `issuetype != "Sub-task"`;
    const now = new Date();

    const terminalJql = `project = ${project} AND status in ("Done/Closed", "Blocked") AND updated >= -${days}d AND ${notSub} ORDER BY updated DESC`;
    // Pull the description everywhere so any ticket's brief can be expanded.
    const terminalFields = buildFields(config, true);

    // Load-more path: only re-pull the terminal window (wider `days`).
    if (part === "terminal") {
      const termIssues = await searchAllIssues(creds, { jql: terminalJql, fields: terminalFields });
      const terminal = normalizeIssues(termIssues, { config, baseUrl, now });
      return NextResponse.json({
        configured: true,
        terminal,
        terminalDays: days,
        fetchedAt: now.toISOString(),
      });
    }

    // Full pull: early pipeline (with brief description), late pipeline (lean),
    // and the terminal window — all concurrently.
    const earlyJql = `project = ${project} AND status in (Intake, Backlog, Prioritized) AND ${notSub}`;
    const lateJql = `project = ${project} AND status in (Design, Dev, Live) AND ${notSub}`;

    const [early, late, term] = await Promise.all([
      pullRanked(creds, earlyJql, buildFields(config, true)),
      pullRanked(creds, lateJql, buildFields(config, true)),
      searchAllIssues(creds, { jql: terminalJql, fields: terminalFields }),
    ]);

    const active = normalizeIssues([...early, ...late], { config, baseUrl, now });
    const terminal = normalizeIssues(term, { config, baseUrl, now });

    return NextResponse.json({
      configured: true,
      active,
      terminal,
      terminalDays: days,
      fetchedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[api/roadmap] error:", err);
    const status = err instanceof JiraApiError ? 502 : 500;
    return NextResponse.json(
      { configured: true, error: (err as Error).message, active: [], terminal: [] },
      { status },
    );
  }
}
