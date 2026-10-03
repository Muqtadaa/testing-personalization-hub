import { JIRA_FIELDS } from "@/lib/intake/config/jira-env";
import type { AppConfig } from "@/lib/intake/config/schema";
import type { JiraIssue } from "@/lib/intake/jira/client";
import { statusToStage, type StageKey } from "./stages";
import { projectLaunch, type ScheduleSegment } from "./project";
import { adfToText, briefText } from "./adf-text";

// Normalizes a raw Jira issue (from /search/jql) into a flat, UI-ready
// RoadmapItem. Custom-field IDs are resolved from the live app config so the
// mapping follows admin changes; option labels are read straight off the select
// value objects Jira returns.

export interface RiceBuckets {
  reach: string | null;
  impact: string | null;
  effort: string | null;
}

export interface RoadmapItem {
  key: string;
  url: string;
  summary: string;
  stage: StageKey;
  statusName: string;
  statusCategory: string | null;
  issueType: string | null;
  isSubtask: boolean;
  rank: string | null;
  priority: string | null;
  lob: string | null;
  journey: string | null;
  requestType: string | null;
  rice: RiceBuckets;
  testType: string | null;
  testTag: string | null;
  assignee: { name: string; avatarUrl: string | null } | null;
  labels: string[];
  created: string | null;
  updated: string | null;
  stageEnteredAt: string | null;
  duedate: string | null;
  resolutionDate: string | null;
  desiredLaunchTiming: string | null;
  /** Plain-text brief from the Jira description (capped), or null. */
  brief: string | null;
  /** ISO date string of the forecast Live date, or null for terminal stages. */
  projectedLaunch: string | null;
  /** Target date used for risk (duedate preferred), ISO or null. */
  targetDate: string | null;
  atRisk: boolean;
  /** Forecast block per remaining pipeline stage (current → Dev). */
  schedule: ScheduleSegment[];
}

/** Jira field IDs we read, resolved from config (with env-driven fallbacks). */
function fieldIds(config: AppConfig) {
  const byIntake: Record<string, string> = {};
  for (const m of config.fieldMappings) byIntake[m.intakeField] = m.jiraFieldId;
  return {
    lob: byIntake["lineOfBusiness"] ?? JIRA_FIELDS.lineOfBusiness,
    journey: byIntake["journeySegment"] ?? JIRA_FIELDS.journey,
    requestType: byIntake["requestType"] ?? JIRA_FIELDS.requestType,
    riceReach: byIntake["rice.reach"] ?? JIRA_FIELDS.riceReach,
    riceImpact: byIntake["rice.impact"] ?? JIRA_FIELDS.riceImpact,
    riceEffort: byIntake["rice.effort"] ?? JIRA_FIELDS.riceEffort,
    rank: JIRA_FIELDS.rank,
  };
}

/** Read a Jira single-select option's display value. */
function selectValue(field: unknown): string | null {
  if (field && typeof field === "object" && "value" in field) {
    const v = (field as { value?: unknown }).value;
    return typeof v === "string" ? v : null;
  }
  return null;
}

const TEST_TAG_RE = /^\s*\[([^\]]+)\]/;

function deriveTestType(summary: string): { tag: string | null; type: string | null } {
  const m = summary.match(TEST_TAG_RE);
  if (!m) return { tag: null, type: null };
  const tag = m[1].trim();
  const norm = tag.toUpperCase().replace(/\s+/g, "");
  if (norm === "AB" || norm === "A/B" || norm === "W-AB" || norm === "WAB")
    return { tag, type: "A/B Test" };
  if (norm === "PZ" || norm === "P13N") return { tag, type: "Personalization" };
  if (norm === "FX") return { tag, type: "Feature" };
  return { tag, type: null };
}

function parseDesiredLaunchTiming(description: unknown): string | null {
  const text = adfToText(description);
  if (!text) return null;
  const m = text.match(/Desired launch timing[:\s]*([^\n]+)/i);
  return m ? m[1].trim() : null;
}

export interface NormalizeOptions {
  config: AppConfig;
  baseUrl: string;
  now?: Date;
}

export function normalizeIssue(issue: JiraIssue, opts: NormalizeOptions): RoadmapItem {
  const { config, baseUrl } = opts;
  const now = opts.now ?? new Date();
  const ids = fieldIds(config);
  const f = issue.fields ?? {};

  const statusObj = f.status as { name?: string; statusCategory?: { key?: string } } | undefined;
  const statusName = statusObj?.name ?? "";
  const stage = statusToStage(statusName);

  const issueTypeObj = f.issuetype as { name?: string; subtask?: boolean } | undefined;
  const assigneeObj = f.assignee as
    | { displayName?: string; avatarUrls?: Record<string, string> }
    | undefined;
  const priorityObj = f.priority as { name?: string } | undefined;

  const summary = (f.summary as string) ?? "";
  const { tag, type } = deriveTestType(summary);

  const rice: RiceBuckets = {
    reach: selectValue(f[ids.riceReach]),
    impact: selectValue(f[ids.riceImpact]),
    effort: selectValue(f[ids.riceEffort]),
  };

  const item: RoadmapItem = {
    key: issue.key,
    url: `${baseUrl}/browse/${issue.key}`,
    summary,
    stage,
    statusName,
    statusCategory: statusObj?.statusCategory?.key ?? null,
    issueType: issueTypeObj?.name ?? null,
    isSubtask: !!issueTypeObj?.subtask,
    rank: (f[ids.rank] as string) ?? null,
    priority: priorityObj?.name ?? null,
    lob: selectValue(f[ids.lob]),
    journey: selectValue(f[ids.journey]),
    requestType: selectValue(f[ids.requestType]),
    rice,
    testType: type,
    testTag: tag,
    assignee: assigneeObj?.displayName
      ? { name: assigneeObj.displayName, avatarUrl: assigneeObj.avatarUrls?.["24x24"] ?? null }
      : null,
    labels: (f.labels as string[]) ?? [],
    created: (f.created as string) ?? null,
    updated: (f.updated as string) ?? null,
    stageEnteredAt: (f.statuscategorychangedate as string) ?? null,
    duedate: (f.duedate as string) ?? null,
    resolutionDate: (f.resolutiondate as string) ?? null,
    desiredLaunchTiming: parseDesiredLaunchTiming(f.description),
    brief: briefText(f.description),
    projectedLaunch: null,
    targetDate: null,
    atRisk: false,
    schedule: [],
  };

  const projection = projectLaunch(item, now);
  item.projectedLaunch = projection.projectedLaunch;
  item.targetDate = projection.targetDate;
  item.atRisk = projection.atRisk;
  item.schedule = projection.schedule;
  return item;
}

export function normalizeIssues(issues: JiraIssue[], opts: NormalizeOptions): RoadmapItem[] {
  return issues.map((i) => normalizeIssue(i, opts));
}
