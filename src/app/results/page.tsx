"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, PageHeader, Tabs, Tab } from "@/components/ui";
import { useResults } from "@/components/results/ResultsDataProvider";
import { ErrorState, NoDataState, PageSkeleton, UpliftValue } from "@/components/results/atoms";
import { KpiLedger, QuarterStory, TopWins } from "@/components/results/OverviewSections";
import ForecastPacingChart from "@/components/results/charts/ForecastPacingChart";
import ProgramCompositionChart from "@/components/results/charts/ProgramCompositionChart";
import {
  annualSeries,
  forecastPacing,
  latestForecast,
  reportedMonths,
  upliftLeaderboard,
  yearsWithData,
  yoySamePeriod,
  ytdTotals,
} from "@/lib/results/derive";
import { formatCompactCurrency, formatIsoDate, formatPercent, splitMonthKey } from "@/lib/results/format";

// Executive overview: the program-value story for leadership — YTD value,
// pacing vs forecast, composition, the quarterly narrative, and top wins.
// Deliberately presentable: no experiment-level operational detail here.

export default function ResultsOverviewPage() {
  const { meta, dataset, loading, error, refetch } = useResults();
  const [yearChoice, setYearChoice] = useState<number | null>(null);

  const view = useMemo(() => {
    if (!dataset) return null;
    const years = yearsWithData(dataset.months);
    if (!years.length) return null;
    const defaultYear = years[years.length - 1];
    const year = yearChoice && years.includes(yearChoice) ? yearChoice : defaultYear;

    const ytd = ytdTotals(dataset.months, year);
    const forecast = latestForecast(dataset);
    const yearForecast = dataset.forecasts.find((f) => f.year === year) ?? null;
    const pacing = yearForecast ? forecastPacing(yearForecast, dataset.months) : null;
    const yoy = yoySamePeriod(dataset.summary, year, ytd.throughMonth);
    const reported = reportedMonths(dataset.months, year);
    const latestMonth = reported.length ? reported[reported.length - 1] : null;

    const yearExperiments = dataset.experiments.filter(
      (e) => splitMonthKey(e.monthKey).year === year,
    );
    const wins = upliftLeaderboard(yearExperiments, "top", 5);

    const annual = annualSeries(dataset);
    const maxAnnual = Math.max(...annual.map((a) => a.total), 1);

    return { years, year, ytd, forecast, yearForecast, pacing, yoy, latestMonth, wins, annual, maxAnnual };
  }, [dataset, yearChoice]);

  if (loading) {
    return (
      <>
        <Header asOf={null} />
        <PageSkeleton />
      </>
    );
  }
  if (error) {
    return (
      <>
        <Header asOf={null} />
        <ErrorState message={error} onRetry={refetch} />
      </>
    );
  }
  if (!dataset || !view) {
    return (
      <>
        <Header asOf={null} />
        <NoDataState />
      </>
    );
  }

  const { years, year, ytd, yearForecast, pacing, yoy, latestMonth, wins, annual, maxAnnual } = view;

  return (
    <>
      <Header asOf={meta?.createdAt ?? null} />
      <div className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        {/* Year switcher (only when more than one year of data exists) */}
        {years.length > 1 && (
          <Tabs
            value={year}
            onChange={(y: unknown) => setYearChoice(Number(y))}
            label="Reporting year"
          >
            {years.map((y) => (
              <Tab key={y} value={y} variant="pill" className="!px-4 !py-2 text-body-sm">
                {y}
              </Tab>
            ))}
          </Tabs>
        )}

        <KpiLedger
          year={year}
          ytdTotal={ytd.total}
          throughMonth={ytd.throughMonth}
          pacing={pacing}
          yoy={yoy}
          latestMonthKey={latestMonth?.monthKey ?? null}
          latestMonthTotal={latestMonth?.total ?? null}
        />

        {/* Pacing + quarterly narrative */}
        {yearForecast ? (
          <div className="grid gap-8 lg:grid-cols-3">
            <Card padding="md" className="lg:col-span-2">
              <h2 className="text-h4 text-charcoal">Pacing against the {yearForecast.year} forecast</h2>
              {pacing?.ratio != null && (
                <p className="mt-0.5 text-body-sm text-muted">
                  {formatPercent(pacing.ratio - 1)} {pacing.ratio >= 1 ? "ahead of" : "behind"} plan
                  through {formatCompactCurrency(pacing.forecastYtd)} forecast to date.
                </p>
              )}
              <div className="mt-4">
                <ForecastPacingChart forecast={yearForecast} />
              </div>
            </Card>
            <QuarterStory quarters={yearForecast.quarters} year={yearForecast.year} />
          </div>
        ) : null}

        {/* Composition + annual context */}
        <div className="grid gap-8 lg:grid-cols-3">
          <Card padding="md" className="lg:col-span-2">
            <h2 className="text-h4 text-charcoal">Where {year} revenue comes from</h2>
            <p className="mt-0.5 text-body-sm text-muted">
              Monthly program totals from the workbook: optimizations, personalizations, recommendations.
            </p>
            <div className="mt-4">
              <ProgramCompositionChart months={dataset.months} year={year} />
            </div>
          </Card>

          <section aria-label="Annual program revenue">
            <h2 className="text-h4 text-charcoal">Year by year</h2>
            <ul className="mt-3 space-y-3">
              {annual.map((a, i) => {
                const prev = i > 0 ? annual[i - 1] : null;
                // No full-year delta for an in-progress year — partial vs full
                // reads as a decline. The ledger's same-period YoY covers it.
                const yoyRatio =
                  !a.partial && prev && !prev.partial && prev.total > 0
                    ? (a.total - prev.total) / prev.total
                    : null;
                return (
                  <li key={a.year}>
                    <div className="flex items-baseline justify-between gap-3 text-body-sm">
                      <span className={a.year === year ? "font-semibold text-body" : "text-muted"}>
                        {a.year}
                        {a.partial ? " (YTD)" : ""}
                      </span>
                      <span className="font-mono tabular-nums text-body">
                        {formatCompactCurrency(a.total)}
                        {yoyRatio != null && (
                          <span className={`ml-2 text-caption ${yoyRatio >= 0 ? "text-accent" : "text-critical-text"}`}>
                            {formatPercent(yoyRatio)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-subtle" aria-hidden>
                      <div
                        className={`h-full rounded-full ${a.year === year ? "bg-lime-600" : "bg-charcoal/70"}`}
                        style={{ width: `${Math.max((a.total / maxAnnual) * 100, 2)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            {dataset.summary && (
              <p className="mt-3 text-caption text-muted">
                Totals from the workbook&rsquo;s Summary sheet and monthly program blocks.
              </p>
            )}
          </section>
        </div>

        <TopWins wins={wins} />

        {/* Net uplift footnote — the measured incremental view */}
        {latestMonth?.netRevenueUplift != null && (
          <p className="text-body-sm text-muted">
            Net revenue uplift (incremental vs control) for{" "}
            {latestMonth ? `${splitMonthKey(latestMonth.monthKey).year}-${String(splitMonthKey(latestMonth.monthKey).month).padStart(2, "0")}` : ""}
            : <UpliftValue value={latestMonth.netRevenueUplift} className="text-body-sm" />.
            Full per-experiment detail lives in the{" "}
            <Link href="/results/explorer" className="font-semibold text-accent hover:underline">
              explorer
            </Link>
            .
          </p>
        )}
      </div>
    </>
  );
}

function Header({ asOf }: { asOf: string | null }) {
  return (
    <PageHeader
      dark
      eyebrow="Measurement"
      title="Results"
      intro={
        asOf
          ? `Program revenue and incremental uplift from the monthly workbook. Data updated ${formatIsoDate(asOf.slice(0, 10))}.`
          : "Program revenue and incremental uplift from the monthly workbook."
      }
    />
  );
}
