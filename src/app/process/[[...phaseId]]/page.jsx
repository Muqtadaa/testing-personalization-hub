'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DocRefPanel,
  Eyebrow,
  GlossaryTerm,
  PageHeader,
  SectionHeader,
  Tab,
  Tabs,
} from '@/components/ui';
import { phases, roleInvolvement } from '@/data/phases.js';

const ROLES = ['Product', 'Engineering', 'Testing & Personalization', 'Analytics'];
const PHASE_PANEL_ID = 'process-phase-panel';

export default function ProcessPage() {
  const params = useParams();
  const phaseId = Array.isArray(params.phaseId) ? params.phaseId[0] : params.phaseId;
  const router = useRouter();
  const initial = phaseId
    ? phases.findIndex((p) => String(p.id) === phaseId)
    : 0;
  const [active, setActive] = useState(initial >= 0 ? initial : 0);
  // If a phaseId was passed but didn't match, we silently fell back to phase 1.
  // Surface that explicitly so a stale link doesn't mislead the user.
  const phaseIdInvalid = phaseId && initial < 0;

  useEffect(() => {
    if (phaseId) {
      const idx = phases.findIndex((p) => String(p.id) === phaseId);
      if (idx >= 0) setActive(idx);
    }
  }, [phaseId]);

  const phase = phases[active];

  function jump(idx) {
    setActive(idx);
    router.push(`/process/${phases[idx].id}`);
  }

  return (
    <>
      <PageHeader
        dark
        eyebrow="The FX process"
        title="Eight phases, four roles, one consistent workflow."
        intro={
          <>
            Click any phase to see the goal, owners, key activities, and
            expected deliverable. Along the way you&apos;ll see the
            language of feature experimentation —{' '}
            <GlossaryTerm term="feature-flag">feature flags</GlossaryTerm>,{' '}
            <GlossaryTerm term="audience">audiences</GlossaryTerm>, and{' '}
            <GlossaryTerm term="guardrail-metric">guardrails</GlossaryTerm>{' '}
            — show up where Optimizely uses them.
          </>
        }
      />

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {phaseIdInvalid && (
            <div
              role="status"
              className="mb-6 p-4 bg-subtle border-l-4 border-lime rounded-r text-body-sm text-charcoal"
            >
              We couldn&apos;t find a phase matching{' '}
              <code className="font-mono text-caption bg-white px-1.5 py-0.5 rounded border border-muted/30">
                {phaseId}
              </code>
              . Showing Phase 1: Intake instead.
            </div>
          )}
          {/* Phase tabs — Tabs primitive gives role=tablist, role=tab, aria-selected, arrow-key navigation. */}
          <Tabs
            value={active}
            onChange={jump}
            label="Process phases"
            layout="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2"
            className="mb-10"
          >
            {phases.map((p, i) => (
              <Tab key={p.id} value={i} variant="card" panelId={PHASE_PANEL_ID}>
                {({ active: isActive }) => (
                  <>
                    <div
                      className={`text-eyebrow uppercase ${
                        isActive ? 'text-accent-on-dark' : 'text-accent'
                      }`}
                    >
                      Phase {p.id}
                    </div>
                    <div
                      className={`text-body-sm font-bold mt-1 leading-tight ${
                        isActive ? 'text-on-dark' : 'text-charcoal'
                      }`}
                    >
                      {p.short}
                    </div>
                  </>
                )}
              </Tab>
            ))}
          </Tabs>

          {/* Phase detail */}
          <div
            id={PHASE_PANEL_ID}
            role="tabpanel"
            tabIndex={0}
            className="grid lg:grid-cols-3 gap-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 rounded"
          >
            <div className="lg:col-span-2 bg-white border border-muted/30 rounded-lg p-7 shadow-card">
              <Eyebrow tone="light">Phase {phase.id} of 8</Eyebrow>
              <h2 className="text-h2 md:text-h2-lg text-charcoal mt-2 accent-underline">
                {phase.name}
              </h2>

              <div className="mt-6">
                <Eyebrow tone="muted" className="mb-2">
                  Goal
                </Eyebrow>
                <p className="text-body">{phase.goal}</p>
              </div>

              <div className="mt-6">
                <Eyebrow tone="muted" className="mb-3">
                  Key activities / decisions
                </Eyebrow>
                <ul className="grid md:grid-cols-2 gap-2">
                  {phase.keyQuestions.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-body-sm">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 w-1.5 h-1.5 rounded-full bg-lime flex-shrink-0"
                      />
                      <span className="text-body">{q}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7 p-4 bg-lime/10 border-l-4 border-lime rounded-r">
                <Eyebrow tone="light" className="mb-1">
                  Phase output
                </Eyebrow>
                <p className="text-charcoal font-medium">{phase.output}</p>
              </div>

              {phase.docs && phase.docs.length > 0 && (
                <div className="mt-8">
                  <DocRefPanel
                    eyebrow="Optimizely reference"
                    title={`Docs for Phase ${phase.id}`}
                    refKeys={phase.docs}
                    variant="subtle"
                  />
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-5">
              <div className="bg-charcoal text-on-dark rounded-lg p-6">
                <Eyebrow tone="dark" className="mb-3">
                  Primary owners
                </Eyebrow>
                <ul className="space-y-2">
                  {phase.owners.map((o) => (
                    <li key={o} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full bg-lime"
                      />
                      <span className="font-medium">{o}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-subtle rounded-lg p-6 border border-muted/30">
                <Eyebrow tone="muted" className="mb-2">
                  Estimated time
                </Eyebrow>
                <div className="text-h2 text-charcoal">{phase.timeline}</div>
                <p className="text-caption text-subtle mt-2 leading-relaxed">
                  {phase.timelineNotes}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  disabled={active === 0}
                  onClick={() => jump(active - 1)}
                  className="px-4 py-2.5 rounded border border-muted text-body-sm font-semibold text-charcoal hover:bg-subtle disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
                >
                  ← Previous phase
                </button>
                <button
                  disabled={active === phases.length - 1}
                  onClick={() => jump(active + 1)}
                  className="px-4 py-2.5 rounded bg-lime text-charcoal text-body-sm font-semibold hover:bg-lime-500 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
                >
                  Next phase →
                </button>
              </div>
            </aside>
          </div>

        </div>
      </section>

      {/* Swimlane — separate section with subtle bg breaks the page into "single-phase view" then "cross-phase view" */}
      <section className="bg-subtle border-t border-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <div>
            <SectionHeader
              eyebrow="Role swimlanes"
              title="Who's involved at each phase"
              size="h2"
              underline
              as="h3"
            />
            <p className="text-muted mt-4 max-w-3xl">
              <span
                aria-hidden="true"
                className="inline-block w-3 h-3 bg-lime rounded-sm align-middle mr-1.5"
              />{' '}
              Owns
              <span
                aria-hidden="true"
                className="inline-block w-3 h-3 bg-lime/30 rounded-sm align-middle ml-4 mr-1.5"
              />{' '}
              Contributes
              <span
                aria-hidden="true"
                className="inline-block w-3 h-3 bg-muted/30 rounded-sm align-middle ml-4 mr-1.5"
              />{' '}
              Not involved
            </p>

            <div className="mt-6 relative">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                {/* Header row — static labels (the tabs at the top are the canonical phase navigator) */}
                <div className="grid grid-cols-[180px_repeat(8,1fr)] gap-2 mb-2">
                  <div></div>
                  {phases.map((p) => (
                    <div
                      key={p.id}
                      className={`text-body-sm font-bold text-center py-2 rounded ${
                        p.id - 1 === active
                          ? 'bg-charcoal text-lime'
                          : 'text-charcoal'
                      }`}
                    >
                      <div className="text-eyebrow uppercase opacity-70">
                        P{p.id}
                      </div>
                      <div className="leading-tight">{p.short}</div>
                    </div>
                  ))}
                </div>

                {/* Role rows */}
                {ROLES.map((role) => {
                  const involvement = roleInvolvement[role];
                  return (
                    <div
                      key={role}
                      className="grid grid-cols-[180px_repeat(8,1fr)] gap-2 mb-2"
                    >
                      <div className="text-body-sm font-bold text-charcoal flex items-center pr-3">
                        {role}
                      </div>
                      {phases.map((p) => {
                        const owns = involvement.owns.includes(p.id);
                        const contributes = involvement.contributes.includes(p.id);
                        const label = owns
                          ? 'Owns'
                          : contributes
                            ? 'Contributes'
                            : 'Not involved';
                        return (
                          <button
                            key={p.id}
                            onClick={() => jump(p.id - 1)}
                            aria-label={`${role} ${label} ${p.name}`}
                            className={`h-12 rounded transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 ${
                              owns
                                ? 'bg-lime hover:bg-lime-500'
                                : contributes
                                  ? 'bg-lime/30 hover:bg-lime/50'
                                  : 'bg-muted/20 hover:bg-muted/40'
                            }`}
                            title={`${role} · ${p.name} · ${label}`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
                </div>
              </div>
              {/* Right-edge fade hint — visible only at narrow widths where the swimlane scrolls horizontally. */}
              <div
                aria-hidden="true"
                className="md:hidden absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-subtle to-transparent pointer-events-none"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
