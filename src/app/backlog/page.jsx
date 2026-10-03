'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, Tabs, Tab } from '@/components/ui';
import { STAGE_META, STAGE_ORDER } from '@/lib/roadmap/stages';
import RoadmapFilters from '@/components/roadmap/RoadmapFilters.jsx';
import RoadmapGantt from '@/components/roadmap/RoadmapGantt.jsx';
import RoadmapTable from '@/components/roadmap/RoadmapTable.jsx';
import RoadmapBoard from '@/components/roadmap/RoadmapBoard.jsx';
import { StageChip, formatTime } from '@/components/roadmap/shared.jsx';

const EMPTY_FILTERS = { stage: 'All', lob: 'All', journey: 'All', requestType: 'All', assignee: 'All', q: '' };
const VIEWS = [
  { value: 'gantt', label: 'Gantt' },
  { value: 'table', label: 'Table' },
  { value: 'board', label: 'Board' },
];
const TERMINAL_STEP = 30;
const TERMINAL_MAX = 365;
// Stages the ticket review agent evaluates (early pipeline only).
const REVIEW_STAGES = ['Intake', 'Backlog', 'Prioritized'];

export default function BacklogPage() {
  const [data, setData] = useState(null); // { configured, active, terminal, fetchedAt, error, terminalDays }
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState('');
  const [view, setView] = useState('gantt');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [terminalDays, setTerminalDays] = useState(TERMINAL_STEP);
  const [loadingMore, setLoadingMore] = useState(false);
  const [terminalMaxed, setTerminalMaxed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reviews, setReviews] = useState(() => new Map()); // key -> TicketReview
  const [reviewing, setReviewing] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [syncedKey, setSyncedKey] = useState(null);

  const load = useCallback(async (isSync) => {
    if (isSync) setSyncing(true);
    else setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/roadmap?days=${terminalDays}&_=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `Request failed (${res.status})`);
      setData(json);
      setTerminalMaxed(false);
      setStatus('ready');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load roadmap.');
      setStatus('error');
    } finally {
      setSyncing(false);
    }
  }, [terminalDays]);

  // Initial load only (Sync and Load more drive subsequent fetches explicitly).
  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Note a ticket we just returned from improving (so we can confirm the re-sync).
  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get('synced');
    if (k) setSyncedKey(k);
  }, []);

  // Run the ticket review agent AFTER the roadmap renders. Non-blocking: the
  // board paints from /api/roadmap, then flags stream in. Re-runs on each full
  // sync (keyed on fetchedAt); cached server-side per (key, updated).
  useEffect(() => {
    if (status !== 'ready' || !data || data.configured === false) return;
    const early = (data.active ?? []).filter((i) => REVIEW_STAGES.includes(i.stage));
    if (!early.length) {
      setReviews(new Map());
      return;
    }
    let cancelled = false;
    setReviewing(true);
    (async () => {
      try {
        const res = await fetch('/api/roadmap/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: early.map((i) => ({
              key: i.key,
              updated: i.updated,
              summary: i.summary,
              brief: i.brief,
              rice: i.rice,
            })),
          }),
        });
        const json = await res.json();
        if (cancelled) return;
        const map = new Map();
        for (const r of json.reviews ?? []) map.set(r.key, r);
        setReviews(map);
      } catch {
        if (!cancelled) setReviews(new Map());
      } finally {
        if (!cancelled) setReviewing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, data?.fetchedAt]);

  const loadMore = useCallback(async () => {
    if (loadingMore || terminalMaxed) return;
    setLoadingMore(true);
    const nextDays = Math.min(TERMINAL_MAX, terminalDays + TERMINAL_STEP);
    try {
      const res = await fetch(`/api/roadmap?part=terminal&days=${nextDays}&_=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || `Request failed (${res.status})`);
      const prevCount = data?.terminal?.length ?? 0;
      const nextCount = json.terminal?.length ?? 0;
      setData((d) => ({ ...d, terminal: json.terminal, terminalDays: json.terminalDays }));
      setTerminalDays(nextDays);
      if (nextCount <= prevCount || nextDays >= TERMINAL_MAX) setTerminalMaxed(true);
    } catch {
      setTerminalMaxed(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, terminalMaxed, terminalDays, data]);

  const allItems = useMemo(() => {
    if (!data) return [];
    const seen = new Set();
    const out = [];
    for (const it of [...(data.active ?? []), ...(data.terminal ?? [])]) {
      if (seen.has(it.key)) continue;
      seen.add(it.key);
      out.push(it);
    }
    return out;
  }, [data]);

  const options = useMemo(() => {
    const uniq = (arr) => ['All', ...Array.from(new Set(arr.filter(Boolean))).sort()];
    return {
      lob: uniq(allItems.map((i) => i.lob)),
      journey: uniq(allItems.map((i) => i.journey)),
      requestType: uniq(allItems.map((i) => i.requestType)),
      assignee: ['All', 'Unassigned', ...Array.from(new Set(allItems.map((i) => i.assignee?.name).filter(Boolean))).sort()],
    };
  }, [allItems]);

  const filtersActive = useMemo(
    () => Object.entries(filters).some(([k, v]) => v !== EMPTY_FILTERS[k]),
    [filters],
  );

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return allItems
      .filter((it) => {
        if (filters.stage !== 'All' && it.stage !== filters.stage) return false;
        if (filters.lob !== 'All' && it.lob !== filters.lob) return false;
        if (filters.journey !== 'All' && it.journey !== filters.journey) return false;
        if (filters.requestType !== 'All' && it.requestType !== filters.requestType) return false;
        if (filters.assignee !== 'All') {
          if (filters.assignee === 'Unassigned' ? it.assignee != null : it.assignee?.name !== filters.assignee)
            return false;
        }
        if (q && !`${it.key} ${it.summary}`.toLowerCase().includes(q)) return false;
        if (flaggedOnly && !reviews.get(it.key)?.flagged) return false;
        return true;
      })
      // Attach the review so the views can render its flag. New object identity
      // when reviews change drives the memoized rows/cards to re-render.
      .map((it) => ({ ...it, review: reviews.get(it.key) ?? null }));
  }, [allItems, filters, reviews, flaggedOnly]);

  const flaggedCount = useMemo(() => {
    let n = 0;
    for (const it of allItems) if (reviews.get(it.key)?.flagged) n += 1;
    return n;
  }, [allItems, reviews]);

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0]));
    for (const it of filtered) counts[it.stage] = (counts[it.stage] ?? 0) + 1;
    return counts;
  }, [filtered]);

  const setFilter = useCallback((key, value) => setFilters((f) => ({ ...f, [key]: value })), []);
  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  return (
    <>
      <PageHeader
        dark
        eyebrow="Delivery"
        title="Roadmap"
        intro="The live experimentation roadmap, pulled straight from Jira (HUB). Intake through Live in full, plus recent Done and Blocked work. Switch between a projected-delivery timeline, a sortable table, and the board."
      />

      {/* Toolbar: view switcher + sync. Pins flush under the nav (73px tall) so
          the buttons don't tuck behind it. z-[25] keeps it above the Gantt's own
          sticky axis header (z-20) but below the nav (z-nav=30). */}
      <section className="bg-white border-b border-muted/30 sticky top-[73px] z-[25]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Tabs value={view} onChange={setView} label="Roadmap view" className="gap-1.5">
            {VIEWS.map((v) => (
              <Tab key={v.value} value={v.value} variant="pill" panelId={`roadmap-panel-${v.value}`} className="!px-4 !py-2 !text-sm">
                {v.label}
              </Tab>
            ))}
          </Tabs>
          <div className="flex items-center gap-3 text-caption text-subtle">
            {data?.fetchedAt && status === 'ready' && (
              <span aria-live="polite">Synced {formatTime(data.fetchedAt)}</span>
            )}
            <button
              onClick={() => load(true)}
              disabled={syncing || status === 'loading'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-charcoal text-charcoal text-body-sm font-semibold hover:bg-charcoal hover:text-on-dark transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={syncing ? 'animate-spin' : ''}
                aria-hidden="true"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <polyline points="21 3 21 9 15 9" />
              </svg>
              {syncing ? 'Syncing…' : 'Sync'}
            </button>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      {status === 'ready' && (
        <section className="bg-white border-b border-muted/30">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <RoadmapFilters
              filters={filters}
              setFilter={setFilter}
              options={options}
              active={filtersActive}
              onClear={clearFilters}
            />
          </div>
        </section>
      )}

      {/* Body */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {status === 'loading' && <LoadingState />}
          {status === 'error' && <ErrorState message={errorMsg} onRetry={() => load(false)} />}
          {status === 'ready' && data?.configured === false && <NotConfiguredState />}

          {status === 'ready' && data?.configured !== false && (
            <>
              {/* Confirmation when returning from the improve flow. */}
              {syncedKey && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-lime/40 bg-lime/[0.06] px-4 py-2.5 text-body-sm text-charcoal">
                  <span>
                    <strong className="font-mono">{syncedKey}</strong> was updated in Jira and the roadmap re-synced.
                  </span>
                  <button
                    onClick={() => setSyncedKey(null)}
                    aria-label="Dismiss"
                    className="text-subtle hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Summary strip */}
              <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                <div className="flex items-center gap-2 flex-wrap" role="status" aria-live="polite">
                  <span className="text-body-sm text-muted">
                    <strong className="text-charcoal tabular-nums">{filtered.length}</strong> of {allItems.length} tickets
                  </span>
                  <span className="h-4 w-px bg-muted/40" aria-hidden="true" />
                  {STAGE_ORDER.filter((s) => stageCounts[s] > 0).map((s) => (
                    <span key={s} className="inline-flex items-center gap-1">
                      <StageChip stage={s} />
                      <span className="text-caption font-semibold text-muted tabular-nums">{stageCounts[s]}</span>
                    </span>
                  ))}
                  {(reviewing || flaggedCount > 0) && (
                    <>
                      <span className="h-4 w-px bg-muted/40" aria-hidden="true" />
                      {reviewing ? (
                        <span className="inline-flex items-center gap-1.5 text-caption text-subtle">
                          <span
                            className="spinner h-3 w-3 rounded-full border-2 border-lime/30 border-t-lime"
                            aria-hidden="true"
                          />
                          Reviewing tickets…
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFlaggedOnly((v) => !v)}
                          aria-pressed={flaggedOnly}
                          title="Tickets missing RICE fields or a quality brief"
                          className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-caption font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
                            flaggedOnly
                              ? 'bg-critical-text text-white'
                              : 'bg-critical-tint text-critical-text hover:opacity-80'
                          }`}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2 1 21h22L12 2zm0 6 7 12H5l7-12zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
                          </svg>
                          {flaggedCount} need{flaggedCount === 1 ? 's' : ''} attention{flaggedOnly ? ' · showing' : ''}
                        </button>
                      )}
                    </>
                  )}
                </div>
                <LoadMore
                  days={data?.terminalDays ?? terminalDays}
                  maxed={terminalMaxed}
                  loading={loadingMore}
                  onClick={loadMore}
                />
              </div>

              {filtered.length === 0 ? (
                <EmptyState onClear={clearFilters} />
              ) : (
                <div id={`roadmap-panel-${view}`} role="tabpanel">
                  {view === 'gantt' && <RoadmapGantt items={filtered} />}
                  {view === 'table' && <RoadmapTable items={filtered} />}
                  {view === 'board' && <RoadmapBoard items={filtered} />}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function LoadMore({ days, maxed, loading, onClick }) {
  return (
    <div className="flex items-center gap-2 text-caption text-subtle">
      <span>
        Done/Blocked: last <strong className="text-muted tabular-nums">{days}</strong> days
      </span>
      {!maxed ? (
        <button
          onClick={onClick}
          disabled={loading}
          className="px-2.5 py-1 rounded border border-muted/45 text-charcoal text-caption font-semibold hover:border-lime transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      ) : (
        <span className="italic">all loaded</span>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading roadmap">
      <div className="h-8 w-48 rounded bg-subtle animate-pulse" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-subtle animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="border border-critical-border bg-critical-tint rounded-lg p-6 text-center flex flex-col items-center gap-3">
      <div className="text-h4 text-critical-text">Couldn’t load the roadmap</div>
      <p className="text-body-sm text-critical-text/90 max-w-md">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded border border-critical-text text-critical-text text-body-sm font-semibold hover:bg-critical-text hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}

function NotConfiguredState() {
  return (
    <div className="border border-muted/40 bg-subtle rounded-lg p-8 text-center flex flex-col items-center gap-3">
      <div className="text-h4 text-charcoal">Jira isn’t connected</div>
      <p className="text-body-sm text-muted max-w-md">
        Set <code className="font-mono text-caption bg-white px-1 rounded border border-muted/40">JIRA_BASE_URL</code>,{' '}
        <code className="font-mono text-caption bg-white px-1 rounded border border-muted/40">JIRA_EMAIL</code>, and{' '}
        <code className="font-mono text-caption bg-white px-1 rounded border border-muted/40">JIRA_API_TOKEN</code> to
        pull the live HUB roadmap.
      </p>
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="text-center py-16 flex flex-col items-center gap-4 border border-dashed border-muted/40 rounded-lg">
      <div className="text-subtle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <div>
        <div className="text-h4 text-charcoal">No tickets match your filters</div>
        <p className="text-body-sm text-muted mt-1">Try adjusting or clearing the filters above.</p>
      </div>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 px-4 py-2 rounded border border-charcoal text-charcoal text-body-sm font-semibold hover:bg-charcoal hover:text-on-dark transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
      >
        Clear filters
      </button>
    </div>
  );
}
