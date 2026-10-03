'use client';

// Read-only Kanban board: one column per stage, cards link out to Jira.
import { memo, useMemo } from 'react';
import { STAGE_META, STAGE_ORDER } from '@/lib/roadmap/stages';
import { Avatar, MetaChip, RiskBadge, formatDate } from './shared.jsx';
import ReviewBadge from './ReviewBadge.jsx';

export default function RoadmapBoard({ items }) {
  const byStage = useMemo(() => {
    const map = Object.fromEntries(STAGE_ORDER.map((s) => [s, []]));
    for (const it of items) (map[it.stage] ?? map.Backlog).push(it);
    return map;
  }, [items]);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {STAGE_ORDER.map((stage) => {
          const meta = STAGE_META[stage];
          const cards = byStage[stage] ?? [];
          return (
            <section
              key={stage}
              aria-label={`${meta.label}: ${cards.length} ticket${cards.length === 1 ? '' : 's'}`}
              className="w-[272px] flex-shrink-0 rounded-lg bg-subtle/60 border border-muted/30 flex flex-col"
            >
              <header
                className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-muted/30 rounded-t-lg"
                style={{ borderTop: `3px solid ${meta.color}` }}
              >
                <span className="flex items-center gap-2 text-body-sm font-bold text-charcoal">
                  <span className="w-2 h-2 rounded-full" aria-hidden="true" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
                <span className="text-caption font-semibold text-muted tabular-nums bg-white border border-muted/40 rounded-full px-2 py-0.5">
                  {cards.length}
                </span>
              </header>
              <div className="p-2 flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '70vh' }}>
                {cards.length === 0 ? (
                  <p className="text-caption text-subtle italic px-1 py-3 text-center">No tickets</p>
                ) : (
                  cards.map((it) => <BoardCard key={it.key} item={it} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const BoardCard = memo(function BoardCard({ item }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md bg-white border border-muted/40 p-2.5 shadow-card transition duration-150 hover:shadow-cardHover hover:border-lime/50 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-mono text-[11px] font-semibold text-accent">{item.key}</span>
        {item.assignee && <Avatar assignee={item.assignee} size={20} />}
      </div>
      {item.review?.flagged && (
        <div className="mb-1.5">
          <ReviewBadge review={item.review} />
        </div>
      )}
      <p className="text-body-sm text-charcoal font-medium leading-snug line-clamp-3">{item.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1 items-center">
        {item.lob && <MetaChip title="Line of business">{item.lob}</MetaChip>}
        {item.journey && <MetaChip title="Journey">{item.journey}</MetaChip>}
        {item.testType && <MetaChip title="Test type">{item.testType}</MetaChip>}
      </div>
      {(item.atRisk || item.projectedLaunch || item.duedate) && (
        <div className="mt-2 pt-2 border-t border-muted/25 flex items-center justify-between gap-2">
          <span className="text-[10px] text-subtle">
            {item.duedate
              ? `Due ${formatDate(item.duedate)}`
              : item.projectedLaunch
                ? `Proj ${formatDate(item.projectedLaunch)}`
                : ''}
          </span>
          <RiskBadge atRisk={item.atRisk} />
        </div>
      )}
    </a>
  );
});
