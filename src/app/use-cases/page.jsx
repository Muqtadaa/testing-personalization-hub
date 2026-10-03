'use client';

import { useState } from 'react';
import { Badge, Eyebrow, PageHeader, Tab, Tabs } from '@/components/ui';
import { useCases } from '@/data/useCases.js';

const USE_CASES_PANEL_ID = 'use-cases-panel';

const TOOL_LABELS = {
  fx: 'FX',
  web: 'Web Exp',
  direct: 'Direct',
};

const TOOL_BADGE_STYLES = {
  fx: 'bg-lime text-charcoal',
  web: 'bg-white text-charcoal border border-charcoal',
  direct: 'bg-muted/40 text-ink border border-muted',
};

const SIDEBAR_STYLES = {
  fx: {
    container: 'bg-charcoal text-on-dark',
    eyebrow: 'text-accent-on-dark',
    body: 'text-on-dark',
    title: 'Why FX?',
  },
  web: {
    container: 'bg-white text-charcoal border-2 border-charcoal',
    eyebrow: 'text-charcoal',
    body: 'text-body',
    title: 'Why Web Experimentation?',
  },
  direct: {
    container: 'bg-subtle text-ink border border-muted',
    eyebrow: 'text-muted',
    body: 'text-body',
    title: 'Why direct release?',
  },
};

export default function UseCasesPage() {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState({});

  function toggle(key) {
    setExpanded((p) => ({ ...p, [key]: !p[key] }));
  }

  const surface = useCases[active];
  const illustrativeCases = surface.cases.filter((c) => c.source !== 'backlog');
  const backlogCases = surface.cases.filter((c) => c.source === 'backlog');

  return (
    <>
      <PageHeader
        dark
        eyebrow="Use cases"
        title="What an FX test looks like on Sample Retail Co surfaces."
        intro="Illustrative scenarios paired with real, RICE-scored items from the test backlog. Each card is tagged with the tool that fits — FX, Web Experimentation, or direct release — so the pattern across customer journey stages emerges as you scan."
      />

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Surface tabs — Tabs primitive provides role=tablist + arrow-key navigation */}
          <Tabs
            value={active}
            onChange={setActive}
            label="Product surfaces"
            layout="grid grid-cols-2 md:grid-cols-4 gap-2"
            className="mb-10"
          >
            {useCases.map((s, i) => {
              const illustrativeCount = s.cases.filter(
                (c) => c.source !== 'backlog'
              ).length;
              const backlogCount = s.cases.filter(
                (c) => c.source === 'backlog'
              ).length;
              return (
                <Tab
                  key={s.surface}
                  value={i}
                  variant="card-lg"
                  panelId={USE_CASES_PANEL_ID}
                >
                  {({ active: isActive }) => (
                    <>
                      <Eyebrow tone={isActive ? 'dark' : 'light'}>
                        Surface
                      </Eyebrow>
                      <div
                        className={`text-h4 mt-1 ${
                          isActive ? 'text-on-dark' : 'text-charcoal'
                        }`}
                      >
                        {s.surface}
                      </div>
                      <div
                        className={`text-caption mt-1 ${
                          isActive ? 'text-on-dark-subtle' : 'text-muted'
                        }`}
                      >
                        {illustrativeCount} illustrative
                        {backlogCount > 0 ? ` · ${backlogCount} from backlog` : ''}
                      </div>
                    </>
                  )}
                </Tab>
              );
            })}
          </Tabs>

          <div id={USE_CASES_PANEL_ID} role="tabpanel">
          {/* Surface summary — single paragraph, no card wrapper (the active tab already names the surface) */}
          <p className="text-body-lg text-body max-w-4xl mb-12">
            {surface.summary}
          </p>

          {/* Illustrative section */}
          {illustrativeCases.length > 0 && (
            <SubSection
              eyebrow="Section 1"
              title="Illustrative scenarios"
              description="Hand-written examples that show what an FX test on this surface could look like."
            >
              <div className="space-y-4">
                {illustrativeCases.map((c, i) => (
                  <CaseCard
                    key={`ill-${active}-${i}`}
                    caseData={c}
                    label={`Use case ${i + 1}`}
                    isOpen={expanded[`ill-${active}-${i}`]}
                    onToggle={() => toggle(`ill-${active}-${i}`)}
                  />
                ))}
              </div>
            </SubSection>
          )}

          {/* Backlog section */}
          {backlogCases.length > 0 && (
            <div className="mt-12">
              <SubSection
                eyebrow="Section 2"
                title="From the real test backlog"
                description="RICE-scored items pulled from the May 2026 test backlog. Tags show whether the team has flagged each one for Feature Experimentation or whether it fits better in Web Experimentation."
              >
                <div className="space-y-4">
                  {backlogCases.map((c, i) => (
                    <CaseCard
                      key={`bl-${active}-${i}`}
                      caseData={c}
                      label={`Backlog item ${i + 1}`}
                      isOpen={expanded[`bl-${active}-${i}`]}
                      onToggle={() => toggle(`bl-${active}-${i}`)}
                    />
                  ))}
                </div>
              </SubSection>
            </div>
          )}
          </div>
        </div>
      </section>
    </>
  );
}

function SubSection({ eyebrow, title, description, children }) {
  return (
    <div>
      <div className="mb-6">
        <Eyebrow tone="light" className="mb-1">
          {eyebrow}
        </Eyebrow>
        <h2 className="text-h2 md:text-h2-lg text-charcoal mb-2">{title}</h2>
        <p className="text-muted max-w-3xl">{description}</p>
      </div>
      {children}
    </div>
  );
}

function CaseCard({ caseData, label, isOpen, onToggle }) {
  const c = caseData;
  const tool = c.recommendedTool || 'fx';
  const sidebar = SIDEBAR_STYLES[tool];

  return (
    <div className="bg-white border border-muted/30 rounded-lg overflow-hidden shadow-card hover:border-lime/40 transition">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
      >
        <div className="flex-1 min-w-0">
          <Eyebrow tone="light" className="mb-1">
            {label}
          </Eyebrow>
          <div className="text-h3 text-charcoal">{c.title}</div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={`text-eyebrow uppercase px-2.5 py-1 rounded ${TOOL_BADGE_STYLES[tool]}`}
          >
            {TOOL_LABELS[tool]}
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            className={`text-charcoal transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      <div className={`accordion ${isOpen ? 'is-open' : ''}`}>
        <div className="accordion-inner">
          <div className="px-6 pb-6 border-t border-muted/20">
            {c.source === 'backlog' && (
              <MetadataStrip
                riceScore={c.riceScore}
                status={c.status}
                page={c.page}
                goal={c.goal}
              />
            )}

            <div className="grid lg:grid-cols-3 gap-6 mt-5">
              <div className="lg:col-span-2 space-y-4">
                <Block label="Hypothesis" body={c.hypothesis} />
                <Block label="Primary KPI" body={c.primaryKpi} />
                <div>
                  <Eyebrow tone="muted" className="mb-2">
                    Guardrail metrics
                  </Eyebrow>
                  <ul className="space-y-1.5">
                    {c.guardrails.map((g, gi) => (
                      <li
                        key={gi}
                        className="flex items-start gap-2 text-body-sm text-body"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-1.5 w-1.5 h-1.5 rounded-full bg-lime flex-shrink-0"
                        />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Block label="Audience" body={c.audience} />
              </div>

              <div className={`${sidebar.container} p-5 rounded-lg`}>
                <div
                  className={`text-eyebrow uppercase ${sidebar.eyebrow} mb-3`}
                >
                  {sidebar.title}
                </div>
                <p className={`text-body-sm ${sidebar.body}`}>
                  {c.toolRationale}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetadataStrip({ riceScore, status, page, goal }) {
  return (
    <div className="mt-5 p-4 bg-subtle rounded-md">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {riceScore != null && (
          <Chip label="RICE" value={String(riceScore)} accent />
        )}
        {status && <Chip label="Status" value={status} />}
        {page && <Chip label="Page" value={page} />}
      </div>
      {goal && (
        <p className="text-body-sm text-muted italic">{goal}</p>
      )}
    </div>
  );
}

function Chip({ label, value, accent }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-caption">
      <span className="text-muted uppercase tracking-eyebrow font-bold">
        {label}
      </span>
      <Badge size="sm" variant={accent ? 'primary' : 'outline'}>
        {value}
      </Badge>
    </span>
  );
}

function Block({ label, body }) {
  return (
    <div>
      <Eyebrow tone="muted" className="mb-1.5">
        {label}
      </Eyebrow>
      <p className="text-body">{body}</p>
    </div>
  );
}
