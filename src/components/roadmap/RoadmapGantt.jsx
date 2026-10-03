'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { PIPELINE_STAGES, RISK_COLOR, RISK_TEXT, STAGE_META, addDays } from '@/lib/roadmap/stages';
import { formatDate } from './shared.jsx';
import ReviewBadge from './ReviewBadge.jsx';

const PX_PER_DAY = 9;
const ROW_H = 38;
const LABEL_W = 280;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY = 86_400_000;
const toDate = (iso) => (iso ? new Date(iso) : null);
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
function mondayOnOrBefore(d) {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return x;
}

// Gantt shows the forward-looking delivery forecast: pipeline tickets
// (Intake→Dev) as an elapsed bar plus per-stage projected segments, and Live
// tickets as shipped markers. Done/Blocked aren't scheduled, so they're summarized.
export default function RoadmapGantt({ items }) {
  // Plot the whole pipeline (Intake→Live). Intake rows carry no projection —
  // they render as an "age in Intake" bar only, since they aren't accepted yet.
  const plotted = useMemo(
    () => items.filter((i) => PIPELINE_STAGES.includes(i.stage)),
    [items],
  );
  const omitted = items.length - plotted.length;

  const domain = useMemo(() => {
    const today = startOfDay(new Date());
    const dates = [today.getTime()];
    for (const it of plotted) {
      for (const v of [it.stageEnteredAt, it.projectedLaunch, it.targetDate, it.duedate]) {
        const d = toDate(v);
        if (d) dates.push(startOfDay(d).getTime());
      }
    }
    const min = mondayOnOrBefore(new Date(Math.min(...dates) - 7 * DAY));
    const max = mondayOnOrBefore(new Date(Math.max(...dates) + 7 * DAY));
    max.setDate(max.getDate() + 7);
    return { start: min, end: max, today };
  }, [plotted]);

  const totalDays = Math.max(7, Math.round((domain.end - domain.start) / DAY));
  const width = totalDays * PX_PER_DAY;
  const xOf = (d) => ((startOfDay(d).getTime() - domain.start.getTime()) / DAY) * PX_PER_DAY;
  const todayX = xOf(domain.today);

  const weeks = useMemo(() => {
    const out = [];
    const c = new Date(domain.start);
    while (c < domain.end) {
      out.push(new Date(c));
      c.setDate(c.getDate() + 7);
    }
    return out;
  }, [domain]);

  const groups = useMemo(() => {
    return [...PIPELINE_STAGES]
      .map((stage) => ({
        stage,
        rows: plotted
          .filter((i) => i.stage === stage)
          .sort((a, b) =>
            (a.projectedLaunch || a.stageEnteredAt || '').localeCompare(
              b.projectedLaunch || b.stageEnteredAt || '',
            ),
          ),
      }))
      .filter((g) => g.rows.length > 0);
  }, [plotted]);

  // Intake starts collapsed: unqualified tickets shouldn't dominate the forecast.
  const [collapsed, setCollapsed] = useState({ Intake: true });
  const [expanded, setExpanded] = useState({});
  const scrollRef = useRef(null);

  // Open the horizontal scroll one week before today so the action is in view.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, xOf(addDays(domain.today, -7)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  if (plotted.length === 0) {
    return (
      <p className="text-body-sm text-muted py-12 text-center border border-dashed border-muted/40 rounded-lg">
        No pipeline or live tickets to plot for the current filters.
      </p>
    );
  }

  return (
    <div>
      <GanttLegend />
      <div ref={scrollRef} className="overflow-x-auto border border-muted/30 rounded-lg">
        <div style={{ width: LABEL_W + width }} className="relative">
          {/* Axis header. Sticks to the top of the Gantt's own scroll container
              (z-20, below the page toolbar's z-[25] so the toolbar stays on top). */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-muted/40" style={{ height: 34 }}>
            <div
              className="sticky left-0 z-30 bg-white border-r border-muted/40 flex items-end px-3 pb-1"
              style={{ width: LABEL_W }}
            >
              <span className="text-[10px] font-bold uppercase tracking-eyebrow text-subtle">Ticket</span>
            </div>
            <div className="relative" style={{ width }}>
              {weeks.map((w, i) => {
                const x = xOf(w);
                const showMonth = i === 0 || w.getDate() <= 7;
                return (
                  <div key={i} className="absolute top-0 bottom-0" style={{ left: x }}>
                    <div className="h-full border-l border-muted/25" />
                    <span className="absolute top-1 left-1 text-[10px] text-subtle whitespace-nowrap tabular-nums">
                      {showMonth ? `${MONTHS[w.getMonth()]} ${w.getDate()}` : w.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today line */}
          <div
            aria-hidden="true"
            className="absolute top-[34px] bottom-0 z-10 pointer-events-none border-l-2 border-charcoal"
            style={{ left: LABEL_W + todayX }}
          >
            <span className="absolute -top-0.5 left-1 text-[9px] font-bold text-charcoal bg-white px-1 rounded">
              Today
            </span>
          </div>

          {/* Groups */}
          {groups.map((g) => {
            const meta = STAGE_META[g.stage];
            const isCollapsed = collapsed[g.stage];
            return (
              <div key={g.stage}>
                <div className="flex sticky left-0 bg-subtle/70 border-b border-muted/30" style={{ width: LABEL_W + width }}>
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [g.stage]: !c[g.stage] }))}
                    aria-expanded={!isCollapsed}
                    className="sticky left-0 z-10 flex items-center gap-2 px-3 py-1.5 text-body-sm font-bold text-charcoal w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                    style={{ width: LABEL_W }}
                  >
                    <span aria-hidden="true" className={`text-subtle transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>▸</span>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
                    {meta.label}
                    <span className="text-caption font-semibold text-muted">({g.rows.length})</span>
                  </button>
                </div>
                {!isCollapsed &&
                  g.rows.map((it) => (
                    <GanttRow
                      key={it.key}
                      item={it}
                      xOf={xOf}
                      width={width}
                      todayX={todayX}
                      open={!!expanded[it.key]}
                      onToggle={() => setExpanded((e) => ({ ...e, [it.key]: !e[it.key] }))}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      </div>
      {omitted > 0 && (
        <p className="text-caption text-subtle mt-2">
          {omitted} done/blocked ticket{omitted === 1 ? '' : 's'} not plotted — see the Table or Board view.
        </p>
      )}
    </div>
  );
}

const GanttRow = memo(function GanttRow({ item, xOf, width, todayX, open, onToggle }) {
  const meta = STAGE_META[item.stage];
  const enteredX = item.stageEnteredAt ? Math.max(0, xOf(new Date(item.stageEnteredAt))) : todayX;
  const projX = item.projectedLaunch ? xOf(new Date(item.projectedLaunch)) : null;
  const targetX = item.targetDate ? xOf(new Date(item.targetDate)) : null;
  const isLive = item.stage === 'Live';
  const segs = item.schedule ?? [];

  const ariaParts = [`${item.key}: ${item.summary}`, `stage ${meta.label}`];
  if (item.projectedLaunch) ariaParts.push(`projected ${formatDate(item.projectedLaunch, { withYear: true })}`);
  if (item.targetDate) ariaParts.push(`target ${formatDate(item.targetDate, { withYear: true })}`);
  if (item.atRisk) ariaParts.push('at risk');

  return (
    <>
      <div className="flex border-b border-muted/20 hover:bg-subtle/40 transition" style={{ height: ROW_H }}>
        <div className="sticky left-0 z-10 bg-white border-r border-muted/30 flex items-center gap-1.5 px-2.5" style={{ width: LABEL_W }}>
          <button
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${item.key} brief`}
            className="text-subtle hover:text-charcoal transition flex-shrink-0 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded"
          >
            <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true">▸</span>
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] font-semibold text-accent hover:underline flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded"
          >
            {item.key}
          </a>
          <button
            onClick={onToggle}
            className="text-body-sm text-charcoal truncate text-left hover:text-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded"
            title={item.summary}
          >
            {item.summary}
          </button>
          <ReviewBadge review={item.review} variant="dot" className="ml-auto" />
        </div>
        <div className="relative" style={{ width }} role="img" aria-label={ariaParts.join(', ')}>
          {isLive ? (
            <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center gap-1" style={{ left: enteredX }}>
              <span className="w-3 h-3 rotate-45 rounded-[2px]" style={{ backgroundColor: meta.color }} aria-hidden="true" />
              <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: meta.text }}>
                Live · {formatDate(item.stageEnteredAt)}
              </span>
            </span>
          ) : (
            <>
              {/* elapsed time in the current stage */}
              {enteredX < todayX && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-l"
                  style={{ left: enteredX, width: Math.max(2, todayX - enteredX), height: 14, backgroundColor: `${meta.color}33` }}
                  title={`In ${meta.label} since ${formatDate(item.stageEnteredAt)}`}
                />
              )}
              {/* per-stage projected segments */}
              {segs.map((seg, i) => {
                const sm = STAGE_META[seg.stage];
                const left = xOf(new Date(seg.start));
                const w = Math.max(3, xOf(new Date(seg.end)) - left);
                const isLast = i === segs.length - 1;
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 flex items-center"
                    style={{
                      left,
                      width: w,
                      height: 14,
                      backgroundColor: `${sm.color}D9`,
                      borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.7)' : 'none',
                      borderTopLeftRadius: i === 0 ? 3 : 0,
                      borderBottomLeftRadius: i === 0 ? 3 : 0,
                      borderTopRightRadius: isLast ? 3 : 0,
                      borderBottomRightRadius: isLast ? 3 : 0,
                      outline: item.atRisk && isLast ? `1.5px solid ${RISK_COLOR}` : 'none',
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.35) 4px, rgba(255,255,255,0.35) 6px)',
                    }}
                    title={`${sm.label}: ${formatDate(seg.start)} – ${formatDate(seg.end)}`}
                  />
                );
              })}
              {projX != null && (
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-caption font-semibold whitespace-nowrap"
                  style={{ left: projX + 6, color: item.atRisk ? RISK_TEXT : meta.text }}
                >
                  {formatDate(item.projectedLaunch)}
                  {item.atRisk ? ' ⚠' : ''}
                </span>
              )}
            </>
          )}
          {targetX != null && !isLive && (
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 border-2 border-charcoal bg-white"
              style={{ left: targetX }}
              title={`Target ${formatDate(item.targetDate, { withYear: true })}`}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
      {open && (
        <div className="border-b border-muted/20 bg-subtle/50 motion-safe:animate-fade-in" style={{ width: LABEL_W + width }}>
          <div className="sticky left-0 px-4 py-3" style={{ width: Math.min(760, LABEL_W + width) }}>
            <GanttRowDetail item={item} />
          </div>
        </div>
      )}
    </>
  );
});

function GanttRowDetail({ item }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-caption">
        <Fact label="LOB" value={item.lob} />
        <Fact label="Journey" value={item.journey} />
        <Fact label="Type" value={item.requestType} />
        <Fact label="Owner" value={item.assignee?.name} />
        <Fact label="Target" value={item.targetDate ? formatDate(item.targetDate, { withYear: true }) : null} />
        <Fact label="Projected" value={item.projectedLaunch ? formatDate(item.projectedLaunch, { withYear: true }) : null} />
      </div>
      {item.brief ? (
        <p className="text-body-sm text-body leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto rounded border border-muted/30 bg-white p-3">
          {item.brief}
        </p>
      ) : (
        <p className="text-body-sm text-subtle italic">No brief on this ticket.</p>
      )}
    </div>
  );
}

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <span>
      <span className="font-bold uppercase tracking-eyebrow text-subtle text-[10px]">{label} </span>
      <span className="text-body font-medium">{value}</span>
    </span>
  );
}

function GanttLegend() {
  const sample = STAGE_META.Prioritized.color; // representative pipeline hue
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3 text-caption text-muted">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-6 h-3 rounded" style={{ backgroundColor: `${sample}33` }} aria-hidden="true" />
        Elapsed
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-6 h-3 rounded"
          style={{
            backgroundColor: `${sample}D9`,
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.35) 4px, rgba(255,255,255,0.35) 6px)',
          }}
          aria-hidden="true"
        />
        Projected (per stage)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-2.5 h-2.5 rotate-45 border-2 border-charcoal bg-white" aria-hidden="true" />
        Target date
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rotate-45 rounded-[2px]" style={{ backgroundColor: STAGE_META.Live.color }} aria-hidden="true" />
        Shipped (Live)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded border-2" style={{ borderColor: RISK_COLOR }} aria-hidden="true" />
        At risk
      </span>
    </div>
  );
}
