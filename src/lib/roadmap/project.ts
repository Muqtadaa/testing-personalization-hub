import {
  PIPELINE_STAGES,
  STAGE_DURATIONS,
  addDays,
  devDurationForEffort,
  type StageKey,
} from "./stages";

// Projected-delivery forecasting. Given a ticket's current pipeline stage and
// how long it has sat there, we walk the remaining stages using standard cycle
// times to forecast a Live date. Terminal stages (Live / Done / Blocked) get no
// projection — they're already at or past the endpoint.

const DEV_INDEX = PIPELINE_STAGES.indexOf("Dev");
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface Projectable {
  stage: StageKey;
  stageEnteredAt: string | null;
  duedate: string | null;
  desiredLaunchTiming: string | null;
  rice: { effort: string | null };
}

export interface ScheduleSegment {
  stage: StageKey;
  start: string; // ISO date
  end: string; // ISO date
}

export interface Projection {
  projectedLaunch: string | null;
  targetDate: string | null;
  atRisk: boolean;
  /** Forecast block per remaining pipeline stage (current → Dev). */
  schedule: ScheduleSegment[];
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function durationFor(stage: StageKey, effort: string | null): number {
  if (stage === "Dev") return devDurationForEffort(effort);
  return STAGE_DURATIONS[stage];
}

/** Best-effort parse of a target date: real due date first, then free text. */
function resolveTarget(item: Projectable): Date | null {
  if (item.duedate) {
    const d = new Date(item.duedate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (item.desiredLaunchTiming) {
    const t = Date.parse(item.desiredLaunchTiming);
    if (!Number.isNaN(t)) return new Date(t);
  }
  return null;
}

export function projectLaunch(item: Projectable, now: Date): Projection {
  const idx = PIPELINE_STAGES.indexOf(item.stage);
  const target = resolveTarget(item);
  const targetDate = target ? toIsoDate(target) : null;

  // No forecast for: non-pipeline stages, Live (already at the endpoint), or
  // Intake (unqualified — not yet accepted or prioritized, so any ETA is fiction).
  if (idx < 0 || idx >= DEV_INDEX + 1 || item.stage === "Intake") {
    return { projectedLaunch: null, targetDate, atRisk: false, schedule: [] };
  }

  // Remaining time in the current stage, accounting for time already spent.
  const current = durationFor(item.stage, item.rice.effort);
  let elapsed = 0;
  if (item.stageEnteredAt) {
    const entered = Date.parse(item.stageEnteredAt);
    if (!Number.isNaN(entered)) {
      elapsed = Math.max(0, (now.getTime() - entered) / MS_PER_DAY);
    }
  }
  const remainingCurrent = Math.max(0.5, current - elapsed);

  // Build a forecast block per remaining stage (current → Dev). Each block
  // carries its own stage so the Gantt can colour the journey ahead.
  const schedule: ScheduleSegment[] = [];
  let cursor = new Date(now.getTime());
  const pushSeg = (stage: StageKey, days: number) => {
    const end = addDays(cursor, Math.ceil(days));
    schedule.push({ stage, start: toIsoDate(cursor), end: toIsoDate(end) });
    cursor = end;
  };
  pushSeg(item.stage, remainingCurrent);
  for (let i = idx + 1; i <= DEV_INDEX; i++) {
    pushSeg(PIPELINE_STAGES[i], durationFor(PIPELINE_STAGES[i], item.rice.effort));
  }

  const projectedLaunch = toIsoDate(cursor);
  const atRisk = !!target && cursor.getTime() > target.getTime();

  return { projectedLaunch, targetDate, atRisk, schedule };
}
