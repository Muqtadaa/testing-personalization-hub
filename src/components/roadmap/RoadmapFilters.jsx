'use client';

import { STAGE_ORDER, STAGE_META } from '@/lib/roadmap/stages';

// Compact dropdown filter bar. Every dimension is a labeled <select> so the
// control row stays a single tidy line that wraps gracefully.

function SelectControl({ label, value, options, onChange }) {
  // options: array of strings, or { value, label } objects.
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <label className="flex items-center gap-1.5 text-body-sm">
      <span className="text-caption font-bold uppercase tracking-eyebrow text-subtle whitespace-nowrap">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-body-sm rounded-md border border-muted/45 bg-white text-charcoal pl-2.5 pr-7 py-1.5 transition hover:border-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function RoadmapFilters({ filters, setFilter, options, active, onClear }) {
  const stageOptions = [
    { value: 'All', label: 'All stages' },
    ...STAGE_ORDER.map((s) => ({ value: s, label: STAGE_META[s].label })),
  ];

  return (
    <div className="flex items-center gap-x-4 gap-y-2.5 flex-wrap">
      <div className="relative min-w-[200px] flex-1 max-w-xs">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          type="search"
          value={filters.q}
          onChange={(e) => setFilter('q', e.target.value)}
          placeholder="Search key or summary…"
          aria-label="Search tickets by key or summary"
          className="w-full text-body-sm rounded-md border border-muted/45 bg-white text-charcoal pl-8 pr-2.5 py-1.5 transition hover:border-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        />
      </div>

      <SelectControl label="Stage" value={filters.stage} options={stageOptions} onChange={(v) => setFilter('stage', v)} />
      {options.lob.length > 1 && (
        <SelectControl label="LOB" value={filters.lob} options={options.lob} onChange={(v) => setFilter('lob', v)} />
      )}
      {options.journey.length > 1 && (
        <SelectControl label="Journey" value={filters.journey} options={options.journey} onChange={(v) => setFilter('journey', v)} />
      )}
      {options.requestType.length > 1 && (
        <SelectControl label="Type" value={filters.requestType} options={options.requestType} onChange={(v) => setFilter('requestType', v)} />
      )}
      {options.assignee.length > 1 && (
        <SelectControl label="Owner" value={filters.assignee} options={options.assignee} onChange={(v) => setFilter('assignee', v)} />
      )}

      {active && (
        <button
          onClick={onClear}
          className="text-caption text-subtle underline underline-offset-2 hover:text-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
