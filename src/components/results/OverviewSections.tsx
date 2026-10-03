"use client";

import Link from "next/link";
import type { ExperimentMonth, ForecastQuarter } from "@/lib/results/types";
import type { Pacing } from "@/lib/results/derive";
import {
  formatCompactCurrency,
  formatCurrency,
  formatMonthKey,
  formatPercent,
  monthName,
} from "@/lib/results/format";
import { UpliftValue } from "./atoms";

// Executive-overview sections. One ledger strip (not a KPI card grid), the
// quarterly narrative, and the top-wins list.

export function KpiLedger({
  year,
  ytdTotal,
  throughMonth,
  pacing,
  yoy,
  latestMonthKey,
  latestMonthTotal,
}: {
  year: number;
  ytdTotal: number;
  throughMonth: number;
  pacing: Pacing | null;
  yoy: { ratio: number | null } | null;
  latestMonthKey: string | null;
  latestMonthTotal: number | null;
}) {
  return (
    <section
      aria-label="Program value summary"
      className="rounded-lg border border-muted/30 bg-white shadow-card"
    >
      <dl className="grid grid-cols-2 divide-muted/30 md:grid-cols-4 md:divide-x">
        <div className="p-5 md:p-6">
          <dt className="text-caption uppercase tracking-eyebrow text-subtle">
            {year} program revenue
          </dt>
          <dd className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-charcoal md:text-4xl">
            {formatCompactCurrency(ytdTotal)}
          </dd>
          <p className="mt-1 text-caption text-muted">
            through {monthName(throughMonth, { long: true })} · {formatCurrency(ytdTotal)}
          </p>
        </div>
        <div className="border-l border-muted/30 p-5 md:border-l-0 md:p-6">
          <dt className="text-caption uppercase tracking-eyebrow text-subtle">vs forecast</dt>
          <dd className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-charcoal">
            {pacing?.ratio != null ? formatPercent(pacing.ratio - 1) : "—"}
          </dd>
          {pacing && (
            <p className="mt-1 text-caption text-muted">
              {formatCompactCurrency(pacing.actualYtd)} vs {formatCompactCurrency(pacing.forecastYtd)} planned
            </p>
          )}
        </div>
        <div className="border-t border-muted/30 p-5 md:border-t-0 md:p-6">
          <dt className="text-caption uppercase tracking-eyebrow text-subtle">vs same period {year - 1}</dt>
          <dd className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-charcoal">
            {yoy?.ratio != null ? formatPercent(yoy.ratio) : "—"}
          </dd>
          <p className="mt-1 text-caption text-muted">year over year, Jan–{monthName(throughMonth)}</p>
        </div>
        <div className="border-l border-t border-muted/30 p-5 md:border-l-0 md:border-t-0 md:p-6">
          <dt className="text-caption uppercase tracking-eyebrow text-subtle">latest month</dt>
          <dd className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-charcoal">
            {formatCompactCurrency(latestMonthTotal)}
          </dd>
          <p className="mt-1 text-caption text-muted">
            {latestMonthKey ? formatMonthKey(latestMonthKey, { long: true }) : "—"}
          </p>
        </div>
      </dl>
    </section>
  );
}

export function QuarterStory({ quarters, year }: { quarters: ForecastQuarter[]; year: number }) {
  if (!quarters.length) return null;
  return (
    <section aria-label={`${year} quarterly plan`}>
      <h2 className="text-h4 text-charcoal">The {year} story, by quarter</h2>
      <ol className="mt-3 divide-y divide-muted/30 rounded-lg border border-muted/30 bg-white shadow-card">
        {quarters.map((q) => {
          const hasActual = q.actual != null && q.actual !== 0;
          return (
            <li key={q.label} className="flex gap-4 p-4">
              <span className="font-mono text-body-sm font-bold text-subtle">{q.label}</span>
              <div className="min-w-0 flex-1">
                {q.theme && <p className="text-body-sm font-semibold text-body">{q.theme}</p>}
                <p className="mt-0.5 text-caption text-muted">
                  Forecast {formatCompactCurrency(q.forecast)}
                  {hasActual && (
                    <>
                      {" · "}actual {formatCompactCurrency(q.actual)}
                      {q.delta != null && (
                        <>
                          {" · "}
                          <UpliftValue value={q.delta} className="text-caption" />
                          {q.pct != null && ` (${formatPercent(q.pct)})`}
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function TopWins({ wins }: { wins: ExperimentMonth[] }) {
  if (!wins.length) return null;
  return (
    <section aria-label="Top experiments by incremental uplift">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-h4 text-charcoal">Top wins</h2>
        <Link
          href="/results/explorer"
          className="text-body-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded"
        >
          Open the explorer →
        </Link>
      </div>
      <ol className="mt-3 divide-y divide-muted/30 rounded-lg border border-muted/30 bg-white shadow-card">
        {wins.map((w, i) => (
          <li key={`${w.key}-${w.monthKey}`}>
            <Link
              href={`/results/experiments/${encodeURIComponent(w.key)}`}
              className="flex items-center gap-4 p-4 transition hover:bg-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              <span className="font-mono text-body-sm font-bold text-subtle">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm font-semibold text-body">
                  {w.displayName ?? w.rawName}
                </span>
                <span className="block text-caption text-muted">{formatMonthKey(w.monthKey, { long: true })}</span>
              </span>
              <UpliftValue value={w.bestUplift} className="shrink-0 text-body-sm font-semibold" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
