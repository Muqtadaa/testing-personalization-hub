"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, Tab } from "@/components/ui";
import type { ExperimentMonth } from "@/lib/results/types";
import { upliftLeaderboard } from "@/lib/results/derive";
import { formatMonthKey } from "@/lib/results/format";
import { TypeBadge, UpliftValue } from "./atoms";

// Top/bottom experiment-months by incremental uplift within the filtered view.

export default function LeaderboardTable({ experiments }: { experiments: ExperimentMonth[] }) {
  const [direction, setDirection] = useState<"top" | "bottom">("top");
  const rows = upliftLeaderboard(experiments, direction, 10);

  return (
    <div>
      <Tabs value={direction} onChange={(v: unknown) => setDirection(v as "top" | "bottom")} label="Leaderboard direction">
        <Tab value="top" variant="pill" className="!px-4 !py-1.5 !text-caption">
          Biggest wins
        </Tab>
        <Tab value="bottom" variant="pill" className="!px-4 !py-1.5 !text-caption">
          Biggest losses
        </Tab>
      </Tabs>
      {rows.length === 0 ? (
        <p className="mt-3 text-body-sm text-muted">No experiments with uplift data in view.</p>
      ) : (
        <ol className="mt-3 divide-y divide-muted/20 rounded-lg border border-muted/30 bg-white shadow-card">
          {rows.map((e, i) => (
            <li key={`${e.key}-${e.monthKey}`}>
              <Link
                href={`/results/experiments/${encodeURIComponent(e.key)}`}
                className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
              >
                <span className="w-6 shrink-0 font-mono text-caption font-bold text-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-medium text-body">
                    {e.displayName ?? e.rawName}
                  </span>
                  <span className="text-caption text-muted">{formatMonthKey(e.monthKey)}</span>
                </span>
                <TypeBadge type={e.type} />
                <UpliftValue value={e.bestUplift} className="w-28 shrink-0 text-right text-body-sm font-semibold" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
