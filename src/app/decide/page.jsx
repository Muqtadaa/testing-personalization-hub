'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eyebrow, PageHeader } from '@/components/ui';
import {
  questions,
  recommendations,
  recommend,
} from '@/data/decisionTree.js';

// localStorage key for persisting in-progress quiz answers across refreshes.
// Versioned so future schema changes can clear stale state.
const STORAGE_KEY = 'fx-decide:v1';

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.answers &&
      typeof parsed.answers === 'object'
    ) {
      return parsed;
    }
  } catch {
    // ignore — corrupted state shouldn't break the page
  }
  return null;
}

export default function DecidePage() {
  // Start from defaults so the server render and the client's first render match,
  // then hydrate any saved progress from localStorage after mount.
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setAnswers(stored.answers || {});
      setShowResult(!!stored.showResult);
    }
    setHydrated(true);
  }, []);

  // Persist state on change (only after hydration, so we never clobber saved
  // progress with the initial defaults). Wrapped in try/catch so a quota/storage
  // error never breaks the quiz.
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (Object.keys(answers).length === 0 && !showResult) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ answers, showResult })
        );
      }
    } catch {
      // ignore — persistence is a nice-to-have, not a requirement
    }
  }, [answers, showResult, hydrated]);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  const result = useMemo(() => {
    if (!allAnswered) return null;
    const signals = questions.map((q) => q.answers[answers[q.id]].signals);
    return recommend(signals);
  }, [answers, allAnswered]);

  const rec = result ? recommendations[result.winner] : null;

  function reset() {
    setAnswers({});
    setShowResult(false);
  }

  function setAnswer(qid, aidx) {
    setAnswers((prev) => ({ ...prev, [qid]: aidx }));
  }

  return (
    <>
      <PageHeader
        dark
        eyebrow="Decision support"
        title="Should this enhancement go through FX?"
        intro="Answer seven questions about the change you are considering. We will recommend Feature Experimentation, web / client-side experimentation, or direct release — with rationale."
      />

      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Progress */}
          <div className="mb-10">
            <div className="flex justify-between items-baseline mb-2 gap-3">
              {allAnswered ? (
                <div className="text-body-sm font-semibold text-accent flex items-center gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  All seven answered — ready when you are.
                </div>
              ) : (
                <div className="text-body-sm text-muted">
                  {answeredCount} of {questions.length} answered
                </div>
              )}
              {answeredCount > 0 && (
                <button
                  onClick={reset}
                  className="text-caption text-subtle underline hover:text-charcoal no-print focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 rounded flex-shrink-0"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="h-2 bg-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-lime transition-all duration-300"
                style={{
                  width: `${(answeredCount / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Questions — semantic radiogroup per question */}
          <ol className="space-y-5">
            {questions.map((q, idx) => {
              const selected = answers[q.id];
              const isAnswered = selected !== undefined;
              const legendId = `decide-q-${q.id}-legend`;
              const helpId = `decide-q-${q.id}-help`;
              return (
                <li
                  key={q.id}
                  className={`bg-white border rounded-lg transition ${
                    isAnswered
                      ? 'border-lime/40 shadow-card'
                      : 'border-muted/30'
                  }`}
                >
                  <fieldset className="p-6 md:p-8 m-0 border-0">
                    <legend className="contents">
                      <div className="flex items-baseline gap-3 mb-2">
                        <Eyebrow tone="light">Q{idx + 1}</Eyebrow>
                        {isAnswered && (
                          <Eyebrow tone="light" className="flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path
                                d="M5 13l4 4L19 7"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Answered
                          </Eyebrow>
                        )}
                      </div>
                      <h2 id={legendId} className="text-h3 text-charcoal">
                        {q.text}
                      </h2>
                      <p id={helpId} className="text-body-sm text-subtle mt-2">
                        {q.help}
                      </p>
                    </legend>

                    <div
                      role="radiogroup"
                      aria-labelledby={legendId}
                      aria-describedby={helpId}
                      className="mt-5 grid gap-2"
                    >
                      {q.answers.map((a, ai) => {
                        const isSelected = selected === ai;
                        return (
                          <button
                            key={ai}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            tabIndex={
                              isSelected || (selected === undefined && ai === 0)
                                ? 0
                                : -1
                            }
                            onClick={() => setAnswer(q.id, ai)}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                                e.preventDefault();
                                setAnswer(q.id, (ai + 1) % q.answers.length);
                              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                                e.preventDefault();
                                setAnswer(
                                  q.id,
                                  (ai - 1 + q.answers.length) % q.answers.length
                                );
                              }
                            }}
                            className={`text-left p-4 rounded-md border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 ${
                              isSelected
                                ? 'border-lime bg-lime/10'
                                : 'border-muted/30 bg-white hover:border-lime/50 hover:bg-subtle'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected
                                    ? 'border-lime bg-lime'
                                    : 'border-muted/60'
                                }`}
                                aria-hidden="true"
                              >
                                {isSelected && (
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="text-charcoal"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M5 13l4 4L19 7"
                                      stroke="currentColor"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-charcoal">
                                  {a.label}
                                </div>
                                {isSelected && (
                                  <div className="text-caption text-subtle mt-2 leading-relaxed animate-fade-in">
                                    {a.rationale}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </li>
              );
            })}
          </ol>

          {/* Result CTA */}
          <div className="mt-10 flex flex-col md:flex-row gap-3 items-center justify-center">
            <button
              disabled={!allAnswered}
              onClick={() => {
                setShowResult(true);
                setTimeout(() => {
                  document
                    .getElementById('decide-result')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className={`px-8 py-4 rounded-md font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 ${
                allAnswered
                  ? 'bg-lime text-charcoal hover:bg-lime-500 shadow-card ready-pulse'
                  : 'bg-muted/40 text-subtle cursor-not-allowed'
              }`}
            >
              {allAnswered
                ? 'See recommendation'
                : `Answer ${questions.length - answeredCount} more question${
                    questions.length - answeredCount === 1 ? '' : 's'
                  }`}
            </button>
          </div>

          {/* Result */}
          {showResult && result && (
            <div id="decide-result" className="mt-12 scroll-mt-24 animate-fade-up">
              <div className="rounded-lg overflow-hidden shadow-cardHover">
                {/* Recommendation-intensity accent stripe — strong lime for FX, softer for Web, neutral for Direct */}
                <div
                  aria-hidden="true"
                  className={`h-1.5 ${rec.stripe}`}
                />
                <div className="bg-charcoal text-on-dark p-8 md:p-10">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Eyebrow tone="dark">Recommendation</Eyebrow>
                    <span className="text-caption text-on-dark-muted">·</span>
                    <span className="text-caption text-on-dark-muted">
                      {rec.intensity}
                    </span>
                  </div>
                  <h2 className="text-h1 md:text-h1-lg mt-2">{rec.title}</h2>
                  <p className="mt-4 text-body-lg text-on-dark-muted max-w-3xl">
                    {rec.summary}
                  </p>

                  <div className="mt-7 bg-charcoal-deeper rounded-md p-5 border border-charcoal-light/40">
                    <Eyebrow tone="dark" className="mb-3">
                      Signal breakdown
                    </Eyebrow>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.entries(result.totals).map(([k, v]) => {
                        const isWinner = k === result.winner;
                        return (
                          <div key={k} className="text-center">
                            <div
                              className={`text-2xl font-bold tabular-nums ${
                                isWinner ? 'text-accent-on-dark' : 'text-on-dark-muted'
                              }`}
                            >
                              {v}
                            </div>
                            <div
                              className={`text-eyebrow uppercase mt-1 ${
                                isWinner ? 'text-accent-on-dark' : 'text-on-dark-subtle'
                              }`}
                            >
                              {k === 'fx'
                                ? 'FX'
                                : k === 'web'
                                  ? 'Web exp.'
                                  : 'Direct'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-7">
                    <Eyebrow tone="dark" className="mb-3">
                      Next steps
                    </Eyebrow>
                    <ol className="space-y-2">
                      {rec.nextSteps.map((s, i) => (
                        <li key={i} className="flex gap-3 text-on-dark-muted">
                          <span className="font-bold text-accent-on-dark tabular-nums flex-shrink-0">
                            {i + 1}.
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href="/templates"
                      className="px-5 py-2.5 rounded bg-lime text-charcoal font-semibold hover:bg-lime-500 transition text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
                    >
                      Use the templates →
                    </Link>
                    <Link
                      href="/process"
                      className="px-5 py-2.5 rounded border border-white/30 text-on-dark hover:bg-charcoal-alt transition text-body-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
                    >
                      See the full process
                    </Link>
                    <button
                      onClick={reset}
                      className="px-5 py-2.5 rounded text-body-sm font-semibold text-on-dark-subtle hover:text-on-dark transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
                    >
                      Start over
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
