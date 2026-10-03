import type { AppConfig } from "@/lib/intake/config/schema";
import type { IntakeFields } from "@/lib/intake/types";

// Preliminary routing. Produces suggested labels and disciplines for triage.
// IMPORTANT: routing is advisory only — it never moves the ticket past Intake.

export interface RoutingResult {
  labels: string[];
  disciplines: string[];
  notes: string[];
}

export function computeRouting(fields: IntakeFields, config: AppConfig): RoutingResult {
  const labels = new Set<string>();
  const disciplines = new Set<string>();
  const notes: string[] = [];

  for (const rule of config.routingRules) {
    const matches = Object.entries(rule.when).every(([k, expected]) => {
      const actual = (fields as unknown as Record<string, unknown>)[k];
      return actual != null && `${actual}` === expected;
    });
    if (matches) {
      rule.suggestedLabels.forEach((l) => labels.add(l));
      rule.suggestedDisciplines.forEach((d) => disciplines.add(d));
      notes.push(rule.description);
    }
  }

  return { labels: [...labels], disciplines: [...disciplines], notes };
}
