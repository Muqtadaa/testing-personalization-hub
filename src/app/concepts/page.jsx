'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Attribution,
  ConceptCard,
  Eyebrow,
  GlossaryTerm,
  PageHeader,
  SectionHeader,
} from '@/components/ui';
import { concepts } from '@/data/concepts.js';

export default function ConceptsPage() {
  const [query, setQuery] = useState('');
  const filterInputRef = useRef(null);

  // Track the URL hash so /concepts#bucketing deep links highlight + scroll to
  // the right card. (Replaces react-router's useLocation().hash.)
  const [hashId, setHashId] = useState(null);
  useEffect(() => {
    const read = () =>
      setHashId(window.location.hash ? window.location.hash.slice(1) : null);
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  // "/" focuses the filter, matching the pattern used by docs sites and dev tools.
  // Ignored when the user is already typing into an input.
  useEffect(() => {
    function onKey(e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      e.preventDefault();
      filterInputRef.current?.focus();
      filterInputRef.current?.select();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Scroll the hash target into view after first paint so deep links land
  // on the right card. scroll-mt-28 on the card handles the sticky-nav offset.
  useEffect(() => {
    if (!hashId) return;
    const el = document.getElementById(hashId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hashId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return concepts;
    return concepts.filter(
      (c) =>
        c.term.toLowerCase().includes(q) ||
        c.oneLineDef.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <>
      <PageHeader
        dark
        eyebrow="Concepts & reference"
        title="The vocabulary, in one place."
        intro={
          <>
            Short summaries of the Feature Experimentation terms that show up
            across phases, roles, and templates — each linked to the canonical
            Optimizely doc so you can go deeper without leaving the workflow.
            Hover any underlined term — like{' '}
            <GlossaryTerm term="feature-flag">feature flag</GlossaryTerm>,{' '}
            <GlossaryTerm term="audience">audience</GlossaryTerm>, or{' '}
            <GlossaryTerm term="bucketing">bucketing</GlossaryTerm> — to see
            it explained inline.
          </>
        }
      />

      <section className="bg-charcoal -mt-px">
        <div className="max-w-7xl mx-auto px-6 pb-6 -mt-2 flex flex-wrap items-center gap-x-8 gap-y-2 text-caption text-on-dark-muted">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-sm bg-lime" />
            <span className="font-bold text-on-dark tabular-nums">{concepts.length}</span>
            <span className="uppercase tracking-eyebrow">terms</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-sm bg-on-dark-subtle/60" />
            <span className="font-bold text-on-dark tabular-nums">1</span>
            <span className="uppercase tracking-eyebrow">source</span>
          </span>
          <span className="text-on-dark-subtle">
            Curated from docs.developers.optimizely.com
          </span>
        </div>
      </section>

      <section className="bg-white border-b border-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Attribution />
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <SectionHeader
              eyebrow="Glossary"
              title="Every term, summarized."
              size="h2"
              as="h2"
            />
            <label className="flex-shrink-0 md:w-80">
              <span className="sr-only">Filter concepts</span>
              <div className="relative">
                <input
                  ref={filterInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter terms or definitions…"
                  className="w-full pl-10 pr-12 py-2.5 text-body-sm rounded-md border border-muted/40 bg-white text-charcoal placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:border-charcoal transition"
                  aria-label="Filter concepts. Press forward slash to focus from anywhere on the page."
                />
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                >
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M20 20l-3.5-3.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <kbd
                  aria-hidden="true"
                  className="hidden md:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-bold text-muted bg-subtle border border-muted/40 rounded font-mono"
                  title="Press / to focus this filter"
                >
                  /
                </kbd>
              </div>
            </label>
          </div>

          <div role="status" aria-live="polite" className="sr-only">
            {query.trim()
              ? `${filtered.length} ${filtered.length === 1 ? 'concept matches' : 'concepts match'} "${query.trim()}".`
              : `Showing all ${concepts.length} concepts.`}
          </div>

          {filtered.length === 0 ? (
            <div className="text-body text-muted py-12 text-center border border-dashed border-muted/40 rounded-lg">
              <Eyebrow tone="muted" className="mb-2">
                No matches
              </Eyebrow>
              <p className="mb-4">
                Nothing matches{' '}
                <span className="font-mono text-charcoal">&quot;{query}&quot;</span>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  filterInputRef.current?.focus();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded border border-charcoal text-charcoal text-body-sm font-semibold hover:bg-charcoal hover:text-on-dark transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((c) => (
                <ConceptCard
                  key={c.id}
                  concept={c}
                  highlighted={c.id === hashId}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-subtle border-t border-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <Attribution />
        </div>
      </section>
    </>
  );
}
