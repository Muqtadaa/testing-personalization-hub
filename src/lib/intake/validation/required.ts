import type { AppConfig, FieldMapping } from "@/lib/intake/config/schema";
import type { IntakeFields } from "@/lib/intake/types";

// Required-field gate. Submission is blocked unless every configured required
// field has a value AND every required Jira-mapped select resolves to a real
// allowed value (per the field mapping valueMap).

export interface ValidationIssue {
  field: string;
  reason: "missing" | "unmappable";
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

const LABELS: Record<string, string> = {
  submitterName: "your name",
  submitterEmail: "your email",
  lineOfBusiness: "line of business",
  journeySegment: "journey segment",
  endUserPlatform: "end-user platform",
  requestType: "request type",
  pageOrUrl: "page / flow / surface / URL",
  targetAudience: "target audience",
  businessContext: "context",
  targetImprovement: "desired outcome",
  primarySuccessMetric: "primary success metric",
  guardrailMetrics: "a guardrail metric",
  desiredLaunchTiming: "timeline / urgency",
  briefTitle: "brief title",
  briefSummary: "brief summary",
};

function value(fields: IntakeFields, key: string): string {
  const v = (fields as unknown as Record<string, unknown>)[key];
  return v == null ? "" : `${v}`.trim();
}

export function validateForSubmit(fields: IntakeFields, config: AppConfig): ValidationResult {
  const issues: ValidationIssue[] = [];

  for (const key of config.requiredFields) {
    if (!value(fields, key)) {
      issues.push({
        field: key,
        reason: "missing",
        message: `Please provide ${LABELS[key] ?? key}.`,
      });
    }
  }

  // Required Jira selects must resolve to an allowed option.
  const selectMappings = config.fieldMappings.filter(
    (m): m is FieldMapping => m.kind === "select" && m.requiredByJira === true && !!m.valueMap,
  );
  for (const m of selectMappings) {
    const v = value(fields, m.intakeField);
    if (!v) continue; // already reported as missing above if required
    if (m.valueMap && !(v in m.valueMap)) {
      const allowed = Object.keys(m.valueMap).join(", ");
      issues.push({
        field: m.intakeField,
        reason: "unmappable",
        message: `"${v}" can't be filed in Jira for ${LABELS[m.intakeField] ?? m.intakeField}. Choose one of: ${allowed}.`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Field keys still missing (for the UI checklist + assistant focus). */
export function missingRequired(fields: IntakeFields, config: AppConfig): string[] {
  return validateForSubmit(fields, config)
    .issues.filter((i) => i.reason === "missing")
    .map((i) => i.field);
}
