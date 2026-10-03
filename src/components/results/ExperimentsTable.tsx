"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import type { ExperimentMonth, VariationResult } from "@/lib/results/types";
import type { ExperimentGroup } from "@/lib/results/derive";
import { formatCurrency, formatIsoDate, formatMonthKey } from "@/lib/results/format";
import { TypeBadge, UpliftValue } from "./atoms";

// Grouped experiments table: one row per experiment (across months), expandable
// to per-month variation detail. Sortable columns, 25 rows per page.

type SortKey = "recent" | "uplift" | "name" | "users";
const PAGE_SIZE = 25;

export default function ExperimentsTable({ groups }: { groups: ExperimentGroup[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    const arr = [...groups];
    const dir = sortDesc ? -1 : 1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "uplift":
          return dir * ((a.totalUplift ?? -Infinity) - (b.totalUplift ?? -Infinity));
        case "users":
          return dir * ((a.totalUsers ?? -1) - (b.totalUsers ?? -1));
        case "name":
          return dir * a.displayName.localeCompare(b.displayName);
        default:
          return dir * a.lastMonthKey.localeCompare(b.lastMonthKey);
      }
    });
    return arr;
  }, [groups, sortKey, sortDesc]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const rows = sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
    setPage(0);
  };

  const toggleExpand = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (!groups.length) {
    return (
      <p className="rounded-lg border border-muted/30 bg-white p-8 text-center text-body-sm text-muted shadow-card">
        No experiments match the current filters.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-muted/30 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-body-sm">
          <thead>
            <tr className="border-b border-muted/30 bg-subtle text-left">
              <th scope="col" className="w-8 px-3 py-2.5" aria-label="Expand" />
              <SortHeader label="Experiment" active={sortKey === "name"} desc={sortDesc} onClick={() => toggleSort("name")} className="min-w-64" />
              <th scope="col" className="px-3 py-2.5 text-caption font-semibold uppercase tracking-eyebrow text-subtle">Type</th>
              <SortHeader label="Active" active={sortKey === "recent"} desc={sortDesc} onClick={() => toggleSort("recent")} />
              <SortHeader label="Users" active={sortKey === "users"} desc={sortDesc} onClick={() => toggleSort("users")} numeric />
              <SortHeader label="Total uplift" active={sortKey === "uplift"} desc={sortDesc} onClick={() => toggleSort("uplift")} numeric />
              <th scope="col" className="px-3 py-2.5" aria-label="Detail link" />
            </tr>
          </thead>
          <tbody className="divide-y divide-muted/20">
            {rows.map((g) => {
              const isOpen = expanded.has(g.key);
              return (
                <Fragment key={g.key}>
                  <tr className="transition hover:bg-subtle/50">
                    <td className="px-3 py-2.5 align-top">
                      <button
                        type="button"
                        onClick={() => toggleExpand(g.key)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} ${g.displayName}`}
                        className="rounded p-1 text-muted transition hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>
                          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-body">{g.displayName}</p>
                      <p className="text-caption text-muted">
                        {g.campaign ?? (g.experimentId ? `ID ${g.experimentId}` : "—")}
                        {g.startDate && ` · ${formatIsoDate(g.startDate)} → ${formatIsoDate(g.endDate)}`}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 align-top"><TypeBadge type={g.type} /></td>
                    <td className="px-3 py-2.5 align-top text-muted">
                      {g.months.length === 1
                        ? formatMonthKey(g.firstMonthKey)
                        : `${formatMonthKey(g.firstMonthKey)} – ${formatMonthKey(g.lastMonthKey)} (${g.months.length} mo)`}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top font-mono tabular-nums text-body">
                      {g.totalUsers == null ? "—" : g.totalUsers.toLocaleString("en-US")}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top">
                      <UpliftValue value={g.totalUplift} className="text-body-sm font-semibold" />
                    </td>
                    <td className="px-3 py-2.5 text-right align-top">
                      <Link
                        href={`/results/experiments/${encodeURIComponent(g.key)}`}
                        className="rounded text-caption font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td />
                      <td colSpan={6} className="px-3 pb-4 pt-1">
                        {g.months.map((m) => (
                          <MonthDetail key={m.monthKey} month={m} />
                        ))}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-muted/30 px-4 py-3">
          <p className="text-caption text-muted">
            {sorted.length.toLocaleString("en-US")} experiments · page {safePage + 1} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              Previous
            </Button>
            <Button variant="ghost" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortHeader({
  label,
  active,
  desc,
  onClick,
  numeric = false,
  className = "",
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onClick: () => void;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <th scope="col" className={`px-3 py-2.5 ${numeric ? "text-right" : "text-left"} ${className}`} aria-sort={active ? (desc ? "descending" : "ascending") : "none"}>
      <button
        type="button"
        onClick={onClick}
        className={`rounded text-caption font-semibold uppercase tracking-eyebrow transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
          active ? "text-body" : "text-subtle hover:text-body"
        }`}
      >
        {label}
        {active && <span aria-hidden> {desc ? "↓" : "↑"}</span>}
      </button>
    </th>
  );
}

function MonthDetail({ month }: { month: ExperimentMonth }) {
  return (
    <div className="mt-2 rounded-md border border-muted/30 bg-subtle/50">
      <p className="flex items-baseline justify-between gap-3 px-3 pt-2.5 text-caption font-semibold text-body">
        {formatMonthKey(month.monthKey, { long: true })}
        <span className="font-normal text-muted">
          {month.totals.users == null ? "" : `${month.totals.users.toLocaleString("en-US")} users`}
        </span>
      </p>
      <table className="mt-1 w-full text-caption">
        <thead>
          <tr className="text-left text-subtle">
            <th scope="col" className="px-3 py-1 font-medium">Variation</th>
            <th scope="col" className="px-3 py-1 text-right font-medium">Users</th>
            <th scope="col" className="px-3 py-1 text-right font-medium">Est. revenue</th>
            <th scope="col" className="px-3 py-1 text-right font-medium">Normalized</th>
            <th scope="col" className="px-3 py-1 text-right font-medium">Uplift vs control</th>
          </tr>
        </thead>
        <tbody>
          {month.variations.map((v) => (
            <VariationRow key={v.label} variation={v} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VariationRow({ variation: v }: { variation: VariationResult }) {
  return (
    <tr className="border-t border-muted/20">
      <td className="px-3 py-1.5 text-body">
        {v.enrichedLabel ?? v.label}
        {v.isControl && <span className="ml-1.5 rounded bg-muted/40 px-1 py-px text-[10px] font-bold uppercase tracking-eyebrow text-ink">Control</span>}
      </td>
      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted">
        {v.users == null ? "—" : v.users.toLocaleString("en-US")}
      </td>
      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted">{formatCurrency(v.estRevenue)}</td>
      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted">{formatCurrency(v.normalizedRevenue)}</td>
      <td className="px-3 py-1.5 text-right">
        {v.isControl ? <span className="text-subtle">baseline</span> : <UpliftValue value={v.uplift} className="text-caption" />}
      </td>
    </tr>
  );
}
