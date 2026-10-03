import type { ExperimentMonth, SourceExperiment } from "@/lib/results/types";

// Merges Source Data metadata into parsed experiments: display name, campaign,
// dates, type override, and friendlier variation labels.

export function enrichExperiments(
  experiments: ExperimentMonth[],
  sourceCatalog: Record<string, SourceExperiment>,
): void {
  for (const exp of experiments) {
    // Fallback display name: raw name without the leading Optimizely id
    // (tolerating stray punctuation after the id, e.g. "…200. - [PZ] …").
    if (!exp.displayName) {
      exp.displayName = exp.rawName.replace(/^\d{8,}[.\s]*-\s*/, "").trim() || exp.rawName;
    }
    const src = exp.experimentId ? sourceCatalog[exp.experimentId] : undefined;
    if (!src) continue;

    if (src.expName) exp.displayName = src.expName;
    exp.campaign = src.campaign;
    exp.startDate = src.startDate;
    exp.endDate = src.endDate;
    exp.webOrderImpacted = src.webOrderImpacted;
    if (/^optimization$/i.test(src.type)) exp.type = "optimization";
    else if (/^personalization$/i.test(src.type)) exp.type = "personalization";

    for (const variation of exp.variations) {
      const labelLower = variation.label.toLowerCase();
      const match = src.variations.find((sv) => {
        const svLower = sv.label.toLowerCase();
        if (labelLower === "original") return svLower.startsWith("original");
        const numMatch = labelLower.match(/variation #(\d+)/);
        return numMatch ? svLower.startsWith(`variation #${numMatch[1]}`) : false;
      });
      variation.enrichedLabel = match ? match.label : null;
    }
  }
}
