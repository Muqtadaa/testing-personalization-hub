"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { Button, Card, Eyebrow, PageHeader } from "@/components/ui";
import { useResults } from "@/components/results/ResultsDataProvider";
import { ErrorState, NoDataState, PageSkeleton, TypeBadge, UpliftValue } from "@/components/results/atoms";
import UpliftTrendChart from "@/components/results/charts/UpliftTrendChart";
import type { ExperimentMonth, VariationResult } from "@/lib/results/types";
import { formatCurrency, formatIsoDate, formatMonthKey } from "@/lib/results/format";

// Per-experiment detail: linkable URL keyed by experiment id (or synthetic
// key), uplift trajectory across months, and full per-month variation tables
// including the holdback split where the workbook provides one.

export default function ExperimentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const key = decodeURIComponent(id);
  const { dataset, loading, error, refetch } = useResults();

  const months = useMemo(
    () =>
      (dataset?.experiments ?? [])
        .filter((e) => e.key === key)
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
    [dataset, key],
  );

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!dataset) return <NoDataState />;

  if (!months.length) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <Card padding="lg" className="mx-auto max-w-xl text-center">
          <h1 className="text-h3 text-charcoal">Experiment not found</h1>
          <p className="mt-2 text-body text-muted">
            Nothing in the current dataset matches this link. It may belong to an
            older upload, or the link may be incomplete.
          </p>
          <div className="mt-6">
            <Button as={Link} href="/results/explorer" variant="secondary">
              Back to the explorer
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const latest = months[months.length - 1];
  const totalUplift = months.reduce((acc, m) => acc + (m.bestUplift ?? 0), 0);

  return (
    <>
      <PageHeader dark compact eyebrow="Results · experiment" title={latest.displayName ?? latest.rawName} />
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <Link
          href="/results/explorer"
          className="inline-flex items-center gap-1 rounded text-body-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        >
          ← Explorer
        </Link>

        {/* Fact strip */}
        <dl className="flex flex-wrap gap-x-10 gap-y-4 rounded-lg border border-muted/30 bg-white p-5 shadow-card">
          <FactItem label="Type">
            <TypeBadge type={latest.type} tag={latest.tag} />
          </FactItem>
          {latest.campaign && <FactItem label="Campaign">{latest.campaign}</FactItem>}
          {latest.startDate && (
            <FactItem label="Window">
              {formatIsoDate(latest.startDate)} → {formatIsoDate(latest.endDate)}
            </FactItem>
          )}
          <FactItem label="Months reported">
            {months.length === 1
              ? formatMonthKey(months[0].monthKey)
              : `${formatMonthKey(months[0].monthKey)} – ${formatMonthKey(latest.monthKey)}`}
          </FactItem>
          <FactItem label="Total best-variation uplift">
            <UpliftValue value={totalUplift} className="text-body-sm font-semibold" />
          </FactItem>
          {latest.experimentId && (
            <FactItem label="Optimizely ID">
              <span className="font-mono text-body-sm">{latest.experimentId}</span>
            </FactItem>
          )}
        </dl>

        {months.length > 1 && (
          <Card padding="md">
            <h2 className="text-h4 text-charcoal">Uplift by month</h2>
            <p className="mt-0.5 text-body-sm text-muted">
              Best variation&rsquo;s incremental revenue vs control, per monthly workbook sheet.
            </p>
            <div className="mt-4">
              <UpliftTrendChart months={months} />
            </div>
          </Card>
        )}

        <section aria-label="Monthly variation results" className="space-y-6">
          {[...months].reverse().map((m) => (
            <MonthCard key={m.monthKey} month={m} />
          ))}
        </section>
      </div>
    </>
  );
}

function FactItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-eyebrow text-subtle">{label}</dt>
      <dd className="mt-1 text-body-sm text-body">{children}</dd>
    </div>
  );
}

function MonthCard({ month }: { month: ExperimentMonth }) {
  return (
    <Card padding="none">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-muted/30 px-5 py-3">
        <h3 className="text-h4 text-charcoal">{formatMonthKey(month.monthKey, { long: true })}</h3>
        <p className="text-caption text-muted">
          {month.totals.users != null && `${month.totals.users.toLocaleString("en-US")} users`}
          {month.totals.estRevenue != null && ` · ${formatCurrency(month.totals.estRevenue)} est. revenue`}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-body-sm">
          <thead>
            <tr className="text-left text-caption text-subtle">
              <th scope="col" className="px-5 py-2 font-medium">Variation</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Users</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Est. revenue</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Actual revenue</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Normalized</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Uplift vs control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/20">
            {month.variations.map((v) => (
              <DetailVariationRow key={v.label} v={v} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DetailVariationRow({ v }: { v: VariationResult }) {
  return (
    <>
      <tr>
        <td className="px-5 py-2.5 text-body">
          {v.enrichedLabel ?? v.label}
          {v.isControl && (
            <span className="ml-2 rounded bg-muted/40 px-1.5 py-px text-[10px] font-bold uppercase tracking-eyebrow text-ink">
              Control
            </span>
          )}
        </td>
        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
          {v.users == null ? "—" : v.users.toLocaleString("en-US")}
        </td>
        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">{formatCurrency(v.estRevenue)}</td>
        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">{formatCurrency(v.actualRevenue)}</td>
        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">{formatCurrency(v.normalizedRevenue)}</td>
        <td className="px-5 py-2.5 text-right">
          {v.isControl ? (
            <span className="text-subtle">baseline</span>
          ) : (
            <UpliftValue value={v.uplift} className="text-body-sm font-semibold" />
          )}
        </td>
      </tr>
      {v.holdback && v.holdback.included.users != null && (
        <tr className="bg-subtle/50">
          <td colSpan={6} className="px-5 py-2">
            <Eyebrow as="span" tone="muted" className="!mb-0 mr-3">
              Holdback split
            </Eyebrow>
            <span className="text-caption text-muted">
              held back: {v.holdback.included.users.toLocaleString("en-US")} users ·{" "}
              {formatCurrency(v.holdback.included.estRevenue)} — exposed:{" "}
              {v.holdback.excluded.users?.toLocaleString("en-US") ?? "—"} users ·{" "}
              {formatCurrency(v.holdback.excluded.estRevenue)}
            </span>
          </td>
        </tr>
      )}
    </>
  );
}
