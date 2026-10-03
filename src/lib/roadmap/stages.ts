// Canonical roadmap stage model for the Jira roadmap board. The team's workflow maps to
// eight stages; the first six form the linear delivery pipeline, while Done and
// Blocked are terminal/side states shown for recent activity only.
//
// Per-stage colors are kept as hex values (not Tailwind classes) on purpose:
// Tailwind cannot generate classes from runtime strings, so every stage-colored
// element renders via inline `style`. `color` drives dots/bars; `text` is the
// AA-contrast text color on white or a light tint of the same hue.

export type StageKey =
  | "Intake"
  | "Backlog"
  | "Prioritized"
  | "Design"
  | "Dev"
  | "Live"
  | "Done"
  | "Blocked";

export interface StageMeta {
  key: StageKey;
  label: string;
  /** Position in the linear pipeline; Done/Blocked sit after it. */
  order: number;
  /** True for the Intake→Live delivery pipeline (always loaded in full). */
  pipeline: boolean;
  /** Solid hue for dots, bars, and the "today" axis. */
  color: string;
  /** Darker variant of the hue — AA on white and on a 10% tint. */
  text: string;
}

// Deliberate cool→lime progression: a ticket's colour saturates and greens as
// it matures down the pipeline, paying off in brand lime at Live. This is a
// considered data-viz palette (not a rainbow) — the only warm hue is the
// `critical` red reserved for Blocked / at-risk, so risk is the thing that pops.
// `color` = bar/dot fill; `text` = its AA-contrast text colour on white or tint.
export const STAGE_META: Record<StageKey, StageMeta> = {
  Intake: { key: "Intake", label: "Intake", order: 0, pipeline: true, color: "#737E91", text: "#454D5C" },
  Backlog: { key: "Backlog", label: "Backlog", order: 1, pipeline: true, color: "#5E83BC", text: "#2D4F7C" },
  Prioritized: { key: "Prioritized", label: "Prioritized", order: 2, pipeline: true, color: "#3F9FB0", text: "#256570" },
  Design: { key: "Design", label: "Design", order: 3, pipeline: true, color: "#46AE82", text: "#256B4C" },
  Dev: { key: "Dev", label: "Dev", order: 4, pipeline: true, color: "#84BE3C", text: "#496B16" },
  Live: { key: "Live", label: "Live", order: 5, pipeline: true, color: "#7FBF1A", text: "#3F620D" },
  Done: { key: "Done", label: "Done / Closed", order: 6, pipeline: false, color: "#5C8A55", text: "#3A5836" },
  Blocked: { key: "Blocked", label: "Blocked", order: 7, pipeline: false, color: "#B4453A", text: "#7A241B" },
};

// Shared brand-token hexes, centralized so components never inline their own.
// Mirror the `critical` and `charcoal` tokens in tailwind.config.js.
export const RISK_COLOR = "#B4453A"; // critical
export const RISK_TEXT = "#7A241B"; // critical-text
export const AXIS_COLOR = "#38353F"; // charcoal — today line, target marker

/** Display order for columns / lanes. */
export const STAGE_ORDER: StageKey[] = [
  "Intake",
  "Backlog",
  "Prioritized",
  "Design",
  "Dev",
  "Live",
  "Done",
  "Blocked",
];

/** The linear delivery pipeline, in order. Live is the pipeline endpoint. */
export const PIPELINE_STAGES: StageKey[] = ["Intake", "Backlog", "Prioritized", "Design", "Dev", "Live"];

/** Terminal/side stages shown only for the recent window. */
export const TERMINAL_STAGES: StageKey[] = ["Done", "Blocked"];

/** Exact Jira status strings on the roadmap board. */
export const ACTIVE_STATUS_NAMES = ["Intake", "Backlog", "Prioritized", "Design", "Dev", "Live"];
export const TERMINAL_STATUS_NAMES = ["Done/Closed", "Blocked"];

/** Map a raw Jira status name to a canonical stage key. */
export function statusToStage(statusName: string | null | undefined): StageKey {
  switch ((statusName ?? "").trim()) {
    case "Intake":
      return "Intake";
    case "Backlog":
      return "Backlog";
    case "Prioritized":
      return "Prioritized";
    case "Design":
      return "Design";
    case "Dev":
      return "Dev";
    case "Live":
      return "Live";
    case "Done/Closed":
    case "Done":
    case "Closed":
      return "Done";
    case "Blocked":
      return "Blocked";
    default:
      // Unknown statuses fall back to Backlog so they never vanish silently.
      return "Backlog";
  }
}

export function stageMeta(stage: StageKey): StageMeta {
  return STAGE_META[stage];
}

/** A 10%-opacity tint of a stage hue, for chip/lane backgrounds. */
export function tint(hex: string, alpha = "1A"): string {
  return `${hex}${alpha}`;
}

// ---------------------------------------------------------------------------
// Projected-delivery model. Standard cycle times (calendar days) for moving a
// ticket through the remaining pipeline. Editable in one place.
// ---------------------------------------------------------------------------

export const STAGE_DURATIONS: Record<StageKey, number> = {
  Intake: 7, // weekly triage
  Backlog: 10, // pre-analysis + qualification
  Prioritized: 10, // waiting on design bandwidth
  Design: 14, // standard design sprint (min 2 weeks)
  Dev: 10, // dev + QA (1–2 weeks)
  Live: 0,
  Done: 0,
  Blocked: 0,
};

/** Dev duration scaled by RICE effort bucket (complexity proxy). */
export function devDurationForEffort(effort: string | null | undefined): number {
  switch ((effort ?? "").toLowerCase()) {
    case "low":
      return 7;
    case "high":
      return 14;
    default:
      return STAGE_DURATIONS.Dev; // Medium / unknown
  }
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}
