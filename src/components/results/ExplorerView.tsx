"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Card, PageHeader } from "@/components/ui";
import type { ExperimentMonth, ExperimentType } from "@/lib/results/types";
import {
  campaignRanking,
  filterExperiments,
  groupExperiments,
  typeMix,
} from "@/lib/results/derive";
import { downloadCsv, toCsv } from "@/lib/results/csv";
import { formatMonthKey } from "@/lib/results/format";
import { useResults } from "./ResultsDataProvider";
import { ErrorState, NoDataState, PageSkeleton } from "./atoms";
import { EMPTY_FILTER_STATE, FilterChips, FiltersBar, type ExplorerFilterState } from "./FiltersBar";
import CurrentMonthChart from "./charts/CurrentMonthChart";
import TypeMixDonut from "./charts/TypeMixDonut";
import CampaignRankingChart from "./charts/CampaignRankingChart";
import LeaderboardTable from "./LeaderboardTable";
import ExperimentsTable from "./ExperimentsTable";

// Team deep-dive: URL-synced filters, cross-filtering charts (each chart
// excludes its own dimension so selections compose), leaderboards, and the
// grouped experiments table with CSV export.

const VALID_TYPES = new Set<ExperimentType>(["optimization", "personalization", "other"]);

function readFilters(params: URLSearchParams): ExplorerFilterState {
  const types = (params.get("type") ?? "")
    .split(",")
    .filter((t): t is ExperimentType => VALID_TYPES.has(t as ExperimentType));
  return {
    from: params.get("from"),
    to: params.get("to"),
    types,
    campaign: params.get("campaign"),
    month: params.get("month"),
    search: params.get("q") ?? "",
  };
}

export default function ExplorerView() {
  const { dataset, loading, error, refetch } = useResults();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(() => readFilters(new URLSearchParams(searchParams)), [searchParams]);

  const update = useCallback(
    (next: Partial<ExplorerFilterState>) => {
      const merged = { ...state, ...next };
      const params = new URLSearchParams();
      if (merged.search) params.set("q", merged.search);
      if (merged.from) params.set("from", merged.from);
      if (merged.to) params.set("to", merged.to);
      if (merged.types.length) params.set("type", merged.types.join(","));
      if (merged.campaign) params.set("campaign", merged.campaign);
      if (merged.month) params.set("month", merged.month);
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    },
    [state, router, pathname],
  );

  const view = useMemo(() => {
    if (!dataset) return null;
    const range: Parameters<typeof filterExperiments>[1] = {
      from: state.from,
      to: state.to,
      types: [],
      campaign: null,
      search: state.search,
    };
    // Base: date range + search only. Each chart then applies every OTHER
    // dimension, so clicking across charts composes instead of hiding options.
    const base = filterExperiments(dataset.experiments, range);
    const applyMonth = (list: ExperimentMonth[]) =>
      state.month ? list.filter((e) => e.monthKey === state.month) : list;

    const withDimensions = filterExperiments(base, { ...range, types: state.types, campaign: state.campaign });
    const forTypeChart = applyMonth(filterExperiments(base, { ...range, campaign: state.campaign }));
    const forCampaignChart = applyMonth(filterExperiments(base, { ...range, types: state.types }));
    const final = applyMonth(withDimensions);

    return {
      monthOptions: [...new Set(dataset.experiments.map((e) => e.monthKey))].sort(),
      types: typeMix(forTypeChart),
      campaigns: campaignRanking(forCampaignChart),
      final,
      groups: groupExperiments(final),
    };
  }, [dataset, state]);

  const exportCsv = useCallback(() => {
    if (!view) return;
    const rows = view.final.flatMap((e) =>
      e.variations.map((v) => ({ e, v })),
    );
    const csv = toCsv(rows, [
      { header: "Month", value: (r) => r.e.monthKey },
      { header: "Experiment ID", value: (r) => r.e.experimentId },
      { header: "Experiment", value: (r) => r.e.displayName ?? r.e.rawName },
      { header: "Campaign", value: (r) => r.e.campaign },
      { header: "Type", value: (r) => r.e.type },
      { header: "Start", value: (r) => r.e.startDate },
      { header: "End", value: (r) => r.e.endDate },
      { header: "Variation", value: (r) => r.v.enrichedLabel ?? r.v.label },
      { header: "Control", value: (r) => (r.v.isControl ? "yes" : "no") },
      { header: "Users", value: (r) => r.v.users },
      { header: "Est. revenue", value: (r) => r.v.estRevenue },
      { header: "Actual revenue", value: (r) => r.v.actualRevenue },
      { header: "Normalized revenue", value: (r) => r.v.normalizedRevenue },
      { header: "Uplift vs control", value: (r) => r.v.uplift },
    ]);
    downloadCsv(`results-experiments-${new Date().toISOString().slice(0, 10)}`, csv);
  }, [view]);

  if (loading) return <><Header /><PageSkeleton /></>;
  if (error) return <><Header /><ErrorState message={error} onRetry={refetch} /></>;
  if (!dataset || !view) return <><Header /><NoDataState /></>;

  return (
    <>
      <Header />
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <div className="space-y-3">
          <FiltersBar state={state} monthOptions={view.monthOptions} onChange={update} />
          <FilterChips state={state} onChange={update} onClearAll={() => update(EMPTY_FILTER_STATE)} />
        </div>

        {/* Cross-filtering charts */}
        <div className="grid gap-6 lg:grid-cols-4">
          <Card padding="sm" className="lg:col-span-2">
            <h2 className="text-body-sm font-semibold text-body">Latest month in view</h2>
            <p className="text-caption text-muted">Ranked by incremental uplift; click through for detail.</p>
            <div className="mt-2">
              <CurrentMonthChart experiments={view.final} />
            </div>
          </Card>
          <Card padding="sm">
            <h2 className="text-body-sm font-semibold text-body">Mix by type</h2>
            <p className="text-caption text-muted">Click to filter.</p>
            <TypeMixDonut
              data={view.types}
              selectedTypes={state.types}
              onToggleType={(t) =>
                update({
                  types: state.types.includes(t)
                    ? state.types.filter((x) => x !== t)
                    : [...state.types, t],
                })
              }
            />
          </Card>
          <Card padding="sm">
            <h2 className="text-body-sm font-semibold text-body">Campaign uplift</h2>
            <p className="text-caption text-muted">Click to filter.</p>
            <div className="mt-2">
              <CampaignRankingChart
                data={view.campaigns}
                selectedCampaign={state.campaign}
                onSelectCampaign={(c) => update({ campaign: c })}
              />
            </div>
          </Card>
        </div>

        <LeaderboardTable experiments={view.final} />

        <section aria-label="All experiments in view">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h4 text-charcoal">
              Experiments
              <span className="ml-2 font-mono text-body-sm font-normal text-muted">
                {view.groups.length.toLocaleString("en-US")}
                {state.month ? ` in ${formatMonthKey(state.month)}` : ""}
              </span>
            </h2>
            <Button variant="ghost" size="sm" onClick={exportCsv}>
              Export CSV
            </Button>
          </div>
          <ExperimentsTable groups={view.groups} />
        </section>
      </div>
    </>
  );
}

function Header() {
  return (
    <PageHeader
      dark
      compact
      eyebrow="Results · team analysis"
      title="Experiment explorer"
    />
  );
}
