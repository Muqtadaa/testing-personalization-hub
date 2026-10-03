"use client";

import Link from "next/link";
import type { ExperimentMonth } from "@/lib/results/types";
import { upliftColors } from "@/lib/results/chartColors";
import { formatCompactCurrency, formatCurrency, formatMonthKey } from "@/lib/results/format";
import { UpliftValue } from "../atoms";

// The latest month's experiment results within the current filter view: net
// uplift headline plus a ranked bar list of that month's experiments. Rows
// link to the experiment detail page.

const MAX_ROWS = 8;

export default function CurrentMonthChart({
  experiments,
}: {
  /** Already-filtered experiment-months; the latest monthKey present is shown. */
  experiments: ExperimentMonth[];
}) {
  if (!experiments.length) {
    return <p className="text-body-sm text-muted">No experiments in view.</p>;
  }

  const latestMonth = experiments.reduce(
    (max, e) => (e.monthKey > max ? e.monthKey : max),
    experiments[0].monthKey,
  );
  // Most winning first; experiments without uplift data sink to the bottom.
  const monthExperiments = experiments
    .filter((e) => e.monthKey === latestMonth)
    .sort(
      (a, b) =>
        (b.bestUplift ?? Number.NEGATIVE_INFINITY) - (a.bestUplift ?? Number.NEGATIVE_INFINITY),
    );
  const netUplift = monthExperiments.reduce((acc, e) => acc + (e.bestUplift ?? 0), 0);
  const rows = monthExperiments.slice(0, MAX_ROWS);
  const max = Math.max(...rows.map((e) => Math.abs(e.bestUplift ?? 0)), 1);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-body-sm text-muted">
          {formatMonthKey(latestMonth, { long: true })} ·{" "}
          {monthExperiments.length.toLocaleString("en-US")} experiment
          {monthExperiments.length === 1 ? "" : "s"}
        </p>
        <p className="text-body-sm">
          <span className="text-muted">net uplift </span>
          <UpliftValue value={netUplift} className="font-semibold" />
        </p>
      </div>
      <ul className="mt-3 space-y-1">
        {rows.map((e) => {
          const uplift = e.bestUplift ?? 0;
          return (
            <li key={e.key}>
              <Link
                href={`/results/experiments/${encodeURIComponent(e.key)}`}
                title={formatCurrency(e.bestUplift)}
                className="group block rounded px-1.5 py-1 transition hover:bg-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-caption text-muted group-hover:text-body">
                    {e.displayName ?? e.rawName}
                  </span>
                  <span className={`shrink-0 font-mono text-caption ${uplift < 0 ? "text-critical-text" : "text-body"}`}>
                    {formatCompactCurrency(uplift)}
                  </span>
                </span>
                <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-subtle" aria-hidden>
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.max((Math.abs(uplift) / max) * 100, 2)}%`,
                      backgroundColor: uplift >= 0 ? upliftColors.positive : upliftColors.negative,
                    }}
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {monthExperiments.length > MAX_ROWS && (
        <p className="mt-2 text-caption text-subtle">
          +{monthExperiments.length - MAX_ROWS} more in the table below
        </p>
      )}
    </div>
  );
}
