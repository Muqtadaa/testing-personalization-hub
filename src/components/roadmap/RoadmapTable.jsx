'use client';

import { memo, useMemo, useState } from 'react';
import { STAGE_META } from '@/lib/roadmap/stages';
import {
  Avatar,
  MetaChip,
  RiskBadge,
  StageChip,
  formatDate,
  formatRelative,
} from './shared.jsx';
import ReviewBadge from './ReviewBadge.jsx';

const COLUMNS = [
  { key: 'key', label: 'Key', sortable: true, className: 'w-[88px]' },
  { key: 'summary', label: 'Summary', sortable: true, className: 'min-w-[240px]' },
  { key: 'stage', label: 'Stage', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'lob', label: 'LOB', sortable: true },
  { key: 'journey', label: 'Journey', sortable: true },
  { key: 'assignee', label: 'Owner', sortable: true },
  { key: 'updated', label: 'Updated', sortable: true },
  { key: 'duedate', label: 'Due', sortable: true },
  { key: 'projectedLaunch', label: 'Projected', sortable: true },
];

const PRIORITY_ORDER = { Highest: 0, High: 1, Medium: 2, Low: 3, Lowest: 4 };

function sortValue(item, key) {
  switch (key) {
    case 'stage':
      return STAGE_META[item.stage]?.order ?? 99;
    case 'priority':
      return PRIORITY_ORDER[item.priority] ?? 9;
    case 'assignee':
      return item.assignee?.name?.toLowerCase() ?? 'zzz';
    case 'updated':
    case 'duedate':
    case 'projectedLaunch':
      return item[key] ? new Date(item[key]).getTime() : -Infinity;
    case 'summary':
      return item.summary.toLowerCase();
    default:
      return (item[key] ?? '').toString().toLowerCase();
  }
}

function SortIcon({ active, dir }) {
  return (
    <span aria-hidden="true" className="text-[8px] leading-none ml-1 inline-block">
      {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
    </span>
  );
}

export default function RoadmapTable({ items }) {
  const [sort, setSort] = useState({ col: 'stage', dir: 'asc' });
  const [expanded, setExpanded] = useState({});

  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const va = sortValue(a, sort.col);
      const vb = sortValue(b, sort.col);
      let r = va < vb ? -1 : va > vb ? 1 : 0;
      if (r === 0) r = a.key.localeCompare(b.key, undefined, { numeric: true });
      return sort.dir === 'asc' ? r : -r;
    });
    return arr;
  }, [items, sort]);

  function toggleSort(col) {
    setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  }

  return (
    <div className="overflow-x-auto border border-muted/30 rounded-lg">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="bg-subtle border-b border-muted/40">
            {COLUMNS.map((c) => {
              const active = sort.col === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-eyebrow text-muted whitespace-nowrap ${c.className ?? ''}`}
                >
                  {c.sortable ? (
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex items-center transition rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${active ? 'text-charcoal' : 'hover:text-charcoal'}`}
                    >
                      {c.label}
                      <SortIcon active={active} dir={sort.dir} />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((it) => {
            const isOpen = !!expanded[it.key];
            return (
              <RoadmapRow
                key={it.key}
                item={it}
                open={isOpen}
                onToggle={() => setExpanded((e) => ({ ...e, [it.key]: !e[it.key] }))}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const RoadmapRow = memo(function RoadmapRow({ item, open, onToggle }) {
  return (
    <>
      <tr
        className={`border-b border-muted/25 transition hover:bg-subtle/60 ${open ? 'bg-subtle/60' : ''}`}
      >
        <td className="px-3 py-2.5 align-top">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[12px] font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded"
          >
            {item.key}
          </a>
        </td>
        <td className="px-3 py-2.5 align-top">
          <button
            onClick={onToggle}
            aria-expanded={open}
            className="text-left text-charcoal font-medium leading-snug hover:text-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded flex items-start gap-1.5"
          >
            <span
              aria-hidden="true"
              className={`mt-1 text-subtle transition-transform ${open ? 'rotate-90' : ''}`}
            >
              ▸
            </span>
            <span>{item.summary}</span>
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-4">
            {item.testType && <MetaChip title="Test type">{item.testType}</MetaChip>}
            {item.atRisk && <RiskBadge atRisk />}
            <ReviewBadge review={item.review} actionable />
          </div>
        </td>
        <td className="px-3 py-2.5 align-top">
          <StageChip stage={item.stage} />
        </td>
        <td className="px-3 py-2.5 align-top whitespace-nowrap">
          {item.priority ? (
            <span className={item.priority === 'High' || item.priority === 'Highest' ? 'font-semibold text-critical-text' : 'text-muted'}>
              {item.priority}
            </span>
          ) : (
            <span className="text-subtle">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 align-top text-muted">{item.lob ?? '—'}</td>
        <td className="px-3 py-2.5 align-top text-muted">{item.journey ?? '—'}</td>
        <td className="px-3 py-2.5 align-top">
          {item.assignee ? (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Avatar assignee={item.assignee} size={20} />
              <span className="text-muted">{item.assignee.name}</span>
            </span>
          ) : (
            <span className="text-subtle">Unassigned</span>
          )}
        </td>
        <td className="px-3 py-2.5 align-top text-muted whitespace-nowrap" title={formatDate(item.updated, { withYear: true })}>
          {formatRelative(item.updated)}
        </td>
        <td className="px-3 py-2.5 align-top text-muted whitespace-nowrap">
          {item.duedate ? formatDate(item.duedate) : '—'}
        </td>
        <td className="px-3 py-2.5 align-top whitespace-nowrap">
          {item.projectedLaunch ? (
            <span className={item.atRisk ? 'font-semibold text-critical-text' : 'text-muted'}>
              {formatDate(item.projectedLaunch)}
            </span>
          ) : (
            <span className="text-subtle">—</span>
          )}
        </td>
      </tr>
      {open && (
        <tr className="bg-subtle/40 border-b border-muted/25">
          <td colSpan={COLUMNS.length} className="px-4 py-4 motion-safe:animate-fade-in">
            <RowDetail item={item} />
          </td>
        </tr>
      )}
    </>
  );
});

function DetailField({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-eyebrow text-subtle mb-0.5">{label}</div>
      <div className="text-body-sm text-body">{children}</div>
    </div>
  );
}

function RowDetail({ item }) {
  const rice = item.rice;
  const hasRice = rice.reach || rice.impact || rice.effort;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <DetailField label="Request type">{item.requestType ?? '—'}</DetailField>
      <DetailField label="Priority">{item.priority ?? '—'}</DetailField>
      <DetailField label="RICE (R/I/E)">
        {hasRice ? `${rice.reach ?? '—'} / ${rice.impact ?? '—'} / ${rice.effort ?? '—'}` : 'Not scored'}
      </DetailField>
      <DetailField label="Target / Projected">
        {item.targetDate ? `Target ${formatDate(item.targetDate, { withYear: true })}` : 'No target'}
        {item.projectedLaunch ? ` · Proj ${formatDate(item.projectedLaunch, { withYear: true })}` : ''}
      </DetailField>
      {item.desiredLaunchTiming && (
        <DetailField label="Desired launch">{item.desiredLaunchTiming}</DetailField>
      )}
      {item.labels.length > 0 && (
        <div className="sm:col-span-2 lg:col-span-2">
          <div className="text-[10px] font-bold uppercase tracking-eyebrow text-subtle mb-1">Labels</div>
          <div className="flex flex-wrap gap-1">
            {item.labels.map((l) => (
              <MetaChip key={l}>{l}</MetaChip>
            ))}
          </div>
        </div>
      )}
      {item.brief && (
        <div className="sm:col-span-2 lg:col-span-4">
          <div className="text-[10px] font-bold uppercase tracking-eyebrow text-subtle mb-1">Brief</div>
          <p className="text-body-sm text-body leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto rounded border border-muted/30 bg-white p-3">
            {item.brief}
          </p>
        </div>
      )}
    </div>
  );
}
