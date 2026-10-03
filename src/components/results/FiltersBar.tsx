"use client";

import { Input, Select } from "@/components/ui";
import type { ExperimentType } from "@/lib/results/types";
import { formatMonthKey } from "@/lib/results/format";

// Explorer filter toolbar + active-filter chips. All state lives in the page
// (synced to URL search params); this renders controls and emits changes.

export interface ExplorerFilterState {
  from: string | null;
  to: string | null;
  types: ExperimentType[];
  campaign: string | null;
  month: string | null; // chart cross-filter
  search: string;
}

export const EMPTY_FILTER_STATE: ExplorerFilterState = {
  from: null,
  to: null,
  types: [],
  campaign: null,
  month: null,
  search: "",
};

const TYPE_LABEL: Record<ExperimentType, string> = {
  optimization: "Optimization",
  personalization: "Personalization",
  other: "Other",
};

export function FiltersBar({
  state,
  monthOptions,
  onChange,
}: {
  state: ExplorerFilterState;
  monthOptions: string[];
  onChange: (next: Partial<ExplorerFilterState>) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-48 flex-1">
        <span className="mb-1 block text-caption text-muted">Search</span>
        <Input
          type="search"
          value={state.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Experiment, campaign, or ID"
        />
      </label>
      <label>
        <span className="mb-1 block text-caption text-muted">From</span>
        <Select
          value={state.from ?? ""}
          onChange={(e) => onChange({ from: e.target.value || null })}
        >
          <option value="">First month</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {formatMonthKey(m)}
            </option>
          ))}
        </Select>
      </label>
      <label>
        <span className="mb-1 block text-caption text-muted">To</span>
        <Select value={state.to ?? ""} onChange={(e) => onChange({ to: e.target.value || null })}>
          <option value="">Latest month</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {formatMonthKey(m)}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}

export function FilterChips({
  state,
  onChange,
  onClearAll,
}: {
  state: ExplorerFilterState;
  onChange: (next: Partial<ExplorerFilterState>) => void;
  onClearAll: () => void;
}) {
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (state.month) {
    chips.push({
      key: "month",
      label: formatMonthKey(state.month, { long: true }),
      clear: () => onChange({ month: null }),
    });
  }
  for (const t of state.types) {
    chips.push({
      key: `type-${t}`,
      label: TYPE_LABEL[t],
      clear: () => onChange({ types: state.types.filter((x) => x !== t) }),
    });
  }
  if (state.campaign) {
    chips.push({ key: "campaign", label: state.campaign, clear: () => onChange({ campaign: null }) });
  }
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Active filters">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.clear}
          className="inline-flex items-center gap-1.5 rounded-full border border-charcoal bg-charcoal px-3 py-1 text-caption font-semibold text-white transition hover:bg-charcoal-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
        >
          {c.label}
          <span aria-hidden>×</span>
          <span className="sr-only">(remove filter)</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="rounded px-2 py-1 text-caption font-semibold text-muted transition hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
      >
        Clear all
      </button>
    </div>
  );
}
