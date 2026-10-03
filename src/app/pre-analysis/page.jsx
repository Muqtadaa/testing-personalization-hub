'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Callout, Card, Eyebrow, PageHeader } from '@/components/ui';
import {
  DEFAULT_LIFTS,
  EXPORT_TOOL_ID,
  SHARE_PARAM,
  STORAGE_KEY,
  buildSummaryText,
  computeScenarios,
  decodeState,
  defaultState,
  encodeState,
  fmtNum,
  fmtPct,
  fmtUSD,
  fmtDays,
  normalizeState,
} from '@/lib/preAnalysis.js';

// ---------- state <-> form helpers ----------

function toForm(st) {
  return {
    form: {
      baselineRate: String(st.baselineRate),
      weeklyTraffic: String(st.weeklyTraffic),
      numVariations: String(st.numVariations),
      sigLevel: st.sigLevel.toFixed(2),
      power: st.power.toFixed(2),
      focValue: String(st.focValue),
      kpiToFoc: String(st.kpiToFoc),
    },
    lifts: st.lifts.map((v) => String(v)),
  };
}

function readState(form, lifts) {
  return {
    baselineRate: parseFloat(form.baselineRate),
    weeklyTraffic: parseFloat(form.weeklyTraffic),
    numVariations: parseInt(form.numVariations, 10),
    sigLevel: parseFloat(form.sigLevel),
    power: parseFloat(form.power),
    focValue: parseFloat(form.focValue),
    kpiToFoc: parseFloat(form.kpiToFoc),
    lifts: lifts.map((v) => parseFloat(v)),
  };
}

function loadSaved() {
  try {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

const VERDICT_LABEL = { good: 'Feasible', warn: 'Slow', bad: 'Not feasible' };

const INPUT_CLS =
  'w-full rounded-md border border-muted/40 bg-white text-charcoal text-body-sm px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:border-charcoal';

// ---------- small presentational pieces ----------

function SectionLabel({ children }) {
  return (
    <div className="text-caption font-bold uppercase tracking-eyebrow text-subtle mb-3 mt-1">
      {children}
    </div>
  );
}

function Field({ label, helper, children }) {
  return (
    <label className="block mb-4 last:mb-0">
      <span className="block text-body-sm font-semibold text-charcoal mb-1.5">
        {label}
      </span>
      {children}
      {helper && (
        <span className="block text-caption text-subtle mt-1.5 leading-snug">
          {helper}
        </span>
      )}
    </label>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-muted/30 last:border-b-0 text-body-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold tabular-nums text-right">{value}</span>
    </div>
  );
}

function VerdictPill({ cls }) {
  if (cls === 'good') return <Badge variant="primary" size="sm">Feasible</Badge>;
  if (cls === 'warn') return <Badge variant="neutral" size="sm">Slow</Badge>;
  return (
    <span className="inline-flex items-center gap-1 rounded font-bold uppercase tracking-eyebrow text-[10px] px-2 py-0.5 bg-critical-tint text-critical-text border border-critical-border">
      Not feasible
    </span>
  );
}

function LiftChart({ scenarios }) {
  const maxWeeks = Math.max(
    8,
    ...scenarios.map((s) => Math.min(s.weeksToSig, 26)),
  );
  const xMax = Math.max(maxWeeks * 1.1, 8.5);
  return (
    <div className="flex flex-col gap-2 mt-1">
      {scenarios.map((s, i) => {
        const weeks = isFinite(s.weeksToSig) ? s.weeksToSig : xMax;
        const widthPct = Math.min((weeks / xMax) * 100, 100);
        const fill =
          s.cls === 'good'
            ? 'bg-lime'
            : s.cls === 'warn'
              ? 'bg-charcoal-light'
              : 'bg-critical';
        return (
          <div
            key={i}
            className="grid grid-cols-[84px_1fr_110px] items-center gap-3 text-body-sm"
          >
            <div className="text-muted tabular-nums">
              +{s.lift.toFixed(2)} pp
            </div>
            <div className="relative h-5 rounded bg-subtle border border-muted/30 overflow-hidden">
              <div
                aria-hidden="true"
                className="absolute -top-0.5 -bottom-0.5 w-px bg-charcoal/35"
                style={{ left: `${(4 / xMax) * 100}%` }}
              />
              <div
                aria-hidden="true"
                className="absolute -top-0.5 -bottom-0.5 w-px bg-charcoal/35"
                style={{ left: `${(8 / xMax) * 100}%` }}
              />
              <div
                className={`h-full ${fill} transition-[width] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <div className="text-right font-semibold tabular-nums">
              {fmtDays(s.daysToSig)}
            </div>
          </div>
        );
      })}
      <div className="grid grid-cols-[84px_1fr_110px] gap-3 text-caption text-subtle">
        <div />
        <div className="relative h-4">
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${(4 / xMax) * 100}%` }}
          >
            4 wk
          </span>
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${(8 / xMax) * 100}%` }}
          >
            8 wk
          </span>
        </div>
        <div />
      </div>
    </div>
  );
}

function Methodology() {
  return (
    <details className="group bg-white border border-muted/30 rounded-lg shadow-card overflow-hidden">
      <summary className="list-none cursor-pointer select-none px-6 py-4 flex items-center justify-between text-body-sm font-bold text-charcoal [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-inset">
        Methodology &amp; formulas
        <span aria-hidden="true" className="text-muted text-lg leading-none">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="px-6 pb-6 text-body-sm text-body leading-relaxed space-y-3">
        <p>
          <strong>Sample size — two-proportion z-test.</strong> For comparing
          two conversion rates with equal allocation:
        </p>
        <pre className="bg-subtle border border-muted/30 rounded-md px-3.5 py-3 font-mono text-caption overflow-x-auto">
          n_per_arm = ( z_α/2 + z_β )² × ( p₁(1−p₁) + p₂(1−p₂) ) / (p₂ − p₁)²
        </pre>
        <p>
          Where <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">p₁</code> is
          the baseline rate,{' '}
          <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">p₂ = p₁ + lift</code>,{' '}
          <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">z_α/2</code> is the
          critical value for the chosen significance level (two-tailed), and{' '}
          <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">z_β</code> is the
          critical value for the chosen power.
        </p>
        <p>
          <strong>Multiple variations — Bonferroni correction.</strong> When
          there are <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">k</code>{' '}
          variations (one control + <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">k−1</code>{' '}
          treatments), we divide α by{' '}
          <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">(k−1)</code>{' '}
          comparisons to control family-wise error. The adjusted α is used to
          look up <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">z_α/2</code>.
        </p>
        <pre className="bg-subtle border border-muted/30 rounded-md px-3.5 py-3 font-mono text-caption overflow-x-auto">
          α_adj = α / (k − 1)
        </pre>
        <p>
          <strong>Runtime.</strong> With{' '}
          <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">k</code> arms and
          weekly traffic <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">T</code>,
          each arm receives{' '}
          <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">T/k</code> users per
          week. Time to significance is{' '}
          <code className="bg-subtle px-1.5 py-0.5 rounded font-mono text-caption">n_per_arm / (T/k)</code>{' '}
          weeks (rounded up to whole days).
        </p>
        <p>
          <strong>Revenue model.</strong> The tool assigns a dollar value to
          the primary KPI by tying it to a downstream conversion:
        </p>
        <pre className="bg-subtle border border-muted/30 rounded-md px-3.5 py-3 font-mono text-caption overflow-x-auto whitespace-pre-wrap">
{`KPI value      = conversion value × (KPI → conversion rate)
Control RPU    = baseline rate × KPI value
Variant RPU    = (baseline + lift) × KPI value
Incremental RPU = Variant RPU − Control RPU
Scaled impact  = Incremental RPU × eligible population`}
        </pre>
        <p>
          <strong>Comparing multiple lifts.</strong> Each scenario uses the
          same baseline, traffic, and statistical parameters — only the target
          lift changes. This isolates the effect of &quot;ambition&quot; on runtime:
          smaller lifts are harder to detect and take longer; larger lifts may
          be unrealistic but resolve quickly. Comparing scenarios helps
          stakeholders see the tradeoff between an ambitious target and a
          realistic test window.
        </p>
        <p>
          <strong>Feasibility verdict.</strong> Per-scenario verdict is based
          on estimated weeks to significance: <em>feasible</em> if ≤ 4 weeks,{' '}
          <em>slow</em> if 4–8 weeks, <em>not feasible</em> if &gt; 8 weeks.
        </p>
        <p>
          <strong>Caveats.</strong> This is a planning tool. It assumes a
          single primary metric, no peeking, equal allocation, and
          approximately normal sampling distributions. It does not account for
          novelty effects, segmentation, sequential testing corrections, or
          covariate adjustment.
        </p>
      </div>
    </details>
  );
}

// ---------- page ----------

export default function PreAnalysisPage() {
  // Initialize from defaults so server and first client render agree. The shared
  // (?s=) state and the saved-analyses list are read from the browser after mount.
  const defaults = useMemo(() => toForm(normalizeState(defaultState())), []);

  const [form, setForm] = useState(defaults.form);
  const [lifts, setLifts] = useState(defaults.lifts);
  const [saved, setSaved] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const fileInputRef = useRef(null);
  const toastTimer = useRef(null);

  // After mount: load saved analyses and apply any shared state from the URL.
  useEffect(() => {
    setSaved(loadSaved());
    try {
      const enc = new URLSearchParams(window.location.search).get(SHARE_PARAM);
      if (enc) {
        const decoded = decodeState(enc);
        if (decoded) {
          const next = toForm(normalizeState(decoded));
          setForm(next.form);
          setLifts(next.lifts);
        }
      }
    } catch (e) {
      // ignore — a malformed share link just falls back to defaults
    }
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function toast(msg) {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 1800);
  }

  const result = useMemo(
    () => computeScenarios(readState(form, lifts), lifts.map((v) => parseFloat(v))),
    [form, lifts],
  );
  const errors = result.errors || null;

  // ---- field handlers ----
  const setField = (name) => (e) =>
    setForm((f) => ({ ...f, [name]: e.target.value }));

  function setLift(i, value) {
    setLifts((arr) => arr.map((v, idx) => (idx === i ? value : v)));
  }
  function addLift() {
    setLifts((arr) => {
      const nums = arr.map(parseFloat).filter((v) => isFinite(v));
      const next = nums.length ? Math.min(Math.max(...nums) + 1, 50) : 2;
      return [...arr, String(next)];
    });
  }
  function removeLift(i) {
    setLifts((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));
  }

  function applyState(st) {
    const next = toForm(normalizeState(st));
    setForm(next.form);
    setLifts(next.lifts);
  }

  function resetDefaults() {
    applyState(defaultState());
    toast('Reset to defaults');
  }

  // ---- save / load / delete (this browser only) ----
  function persistSaved(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      setSaved(arr);
    } catch (e) {
      toast('Could not save to this browser (storage unavailable or full)');
    }
  }
  function saveAnalysis() {
    const name = (window.prompt('Name this analysis:') || '').trim();
    if (!name) return;
    const rec = {
      id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      savedAt: new Date().toISOString(),
      state: readState(form, lifts),
    };
    const arr = [...loadSaved(), rec];
    persistSaved(arr);
    setSelectedId(rec.id);
    toast('Analysis saved');
  }
  function loadSelected() {
    if (!selectedId) return;
    const rec = loadSaved().find((r) => r.id === selectedId);
    if (rec) {
      applyState(rec.state);
      toast(`Loaded "${rec.name}"`);
    }
  }
  function deleteSelected() {
    if (!selectedId) return;
    const rec = loadSaved().find((r) => r.id === selectedId);
    if (rec && window.confirm(`Delete saved analysis "${rec.name}"?`)) {
      persistSaved(loadSaved().filter((r) => r.id !== selectedId));
      setSelectedId('');
      toast(`Deleted "${rec.name}"`);
    }
  }

  // ---- share / export / import ----
  function copyShareLink() {
    const enc = encodeState(readState(form, lifts));
    const url = `${window.location.origin}/pre-analysis?${SHARE_PARAM}=${encodeURIComponent(enc)}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast('Share link copied to clipboard'))
      .catch(() => window.prompt('Copy share link:', url));
  }
  function exportJson() {
    const payload = {
      tool: EXPORT_TOOL_ID,
      version: 1,
      exportedAt: new Date().toISOString(),
      state: readState(form, lifts),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      'experiment-pre-analysis-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast('Analysis exported');
  }
  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        applyState(parsed && parsed.state ? parsed.state : parsed);
        toast('Analysis imported');
      } catch (e) {
        toast('Could not import — not a valid analysis JSON');
      }
    };
    reader.onerror = () => toast('Could not read that file');
    reader.readAsText(file);
  }
  function copySummary() {
    if (errors) {
      toast('Fix the input errors before copying');
      return;
    }
    const text = buildSummaryText(result);
    navigator.clipboard
      .writeText(text)
      .then(() => toast('Summary copied to clipboard'))
      .catch(() => window.prompt('Copy summary:', text));
  }

  const sortedSaved = [...saved].sort((a, b) =>
    (b.savedAt || '').localeCompare(a.savedAt || ''),
  );

  return (
    <>
      <PageHeader
        dark
        eyebrow="Experimentation toolkit"
        title="Pre-Analysis"
        intro="Compare multiple target lifts side-by-side to gut-check feasibility, runtime, and revenue impact before you launch an experiment."
      />

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Callout variant="subtle" className="mb-8">
            <span className="text-body-sm text-muted">
              These are <strong className="text-charcoal">directional planning estimates</strong>.
              Validate with your Analytics or Experimentation SMEs before
              locking launch decisions. Saved analyses live in this browser only.
            </span>
          </Callout>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,420px)_minmax(0,1fr)] gap-5 items-start">
            {/* ---------------- INPUTS ---------------- */}
            <Card padding="md" className="lg:sticky lg:top-24">
              <Eyebrow tone="light" className="mb-5">
                Inputs
              </Eyebrow>

              {errors && (
                <div
                  role="alert"
                  className="mb-5 rounded-md border border-critical-border bg-critical-tint px-3.5 py-3 text-body-sm text-critical-text"
                >
                  <strong>Please fix the following:</strong>
                  <ul className="mt-1.5 pl-4 list-disc space-y-0.5">
                    {errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <SectionLabel>Test population</SectionLabel>

              <Field
                label="Baseline conversion rate (primary KPI)"
                helper="Current rate for your primary KPI before the test — the share of eligible users who complete the KPI action today."
              >
                <div className="relative">
                  <input
                    type="number"
                    className={`${INPUT_CLS} pr-9`}
                    value={form.baselineRate}
                    min="0.01"
                    max="99.99"
                    step="0.1"
                    onChange={setField('baselineRate')}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-subtle pointer-events-none">
                    %
                  </span>
                </div>
              </Field>

              <Field
                label="Weekly traffic in test population"
                helper="Total users per week eligible to be allocated into the experiment, across all variations."
              >
                <input
                  type="number"
                  className={INPUT_CLS}
                  value={form.weeklyTraffic}
                  min="1"
                  step="1000"
                  onChange={setField('weeklyTraffic')}
                />
              </Field>

              <Field
                label="Number of variations (including control)"
                helper="Total arms. 2 = standard A/B test. More arms split traffic and increase the sample size required."
              >
                <input
                  type="number"
                  className={INPUT_CLS}
                  value={form.numVariations}
                  min="2"
                  max="10"
                  step="1"
                  onChange={setField('numVariations')}
                />
              </Field>

              <hr className="border-muted/30 my-5" />
              <SectionLabel>Statistical parameters</SectionLabel>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Significance"
                  helper="1 − α. Higher reduces false positives but needs more samples."
                >
                  <select
                    className={INPUT_CLS}
                    value={form.sigLevel}
                    onChange={setField('sigLevel')}
                  >
                    <option value="0.90">90%</option>
                    <option value="0.95">95%</option>
                    <option value="0.99">99%</option>
                  </select>
                </Field>
                <Field
                  label="Power"
                  helper="1 − β. Probability of detecting a true effect of the assumed size."
                >
                  <select
                    className={INPUT_CLS}
                    value={form.power}
                    onChange={setField('power')}
                  >
                    <option value="0.80">80%</option>
                    <option value="0.90">90%</option>
                    <option value="0.95">95%</option>
                  </select>
                </Field>
              </div>

              <hr className="border-muted/30 my-5" />
              <SectionLabel>Target lifts to compare</SectionLabel>

              <div className="flex flex-col gap-2">
                {lifts.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        className={`${INPUT_CLS} pr-9`}
                        value={v}
                        min="0.01"
                        max="50"
                        step="0.1"
                        aria-label={`Lift scenario ${i + 1} (percentage points)`}
                        onChange={(e) => setLift(i, e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-subtle pointer-events-none">
                        pp
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove lift scenario ${i + 1}`}
                      disabled={lifts.length === 1}
                      onClick={() => removeLift(i)}
                      className="w-9 h-9 shrink-0 rounded-md border border-muted/40 text-muted transition hover:bg-critical-tint hover:text-critical-text hover:border-critical-border disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted disabled:hover:border-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addLift}
                className="mt-2 w-full rounded-md border border-dashed border-muted/50 px-3 py-2 text-body-sm font-semibold text-accent transition hover:bg-subtle hover:border-charcoal-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
              >
                + Add lift scenario
              </button>
              <p className="text-caption text-subtle mt-2 leading-snug">
                Absolute percentage points. E.g. 10% → 12% is +2 pp.
              </p>

              <hr className="border-muted/30 my-5" />
              <SectionLabel>Revenue model</SectionLabel>

              <Field
                label="Value of one downstream conversion"
                helper="Average revenue or contribution value of one completed downstream conversion."
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-caption text-subtle pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    className={`${INPUT_CLS} pl-6`}
                    value={form.focValue}
                    min="0"
                    step="10"
                    onChange={setField('focValue')}
                  />
                </div>
              </Field>

              <Field
                label="KPI → conversion rate"
                helper="Of users who complete the primary KPI action, what share eventually convert downstream. Used to assign a $ value to the KPI."
              >
                <div className="relative">
                  <input
                    type="number"
                    className={`${INPUT_CLS} pr-9`}
                    value={form.kpiToFoc}
                    min="0.01"
                    max="100"
                    step="0.1"
                    onChange={setField('kpiToFoc')}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-subtle pointer-events-none">
                    %
                  </span>
                </div>
              </Field>

              <div className="flex flex-wrap gap-2 mt-6">
                <Button variant="secondary" size="sm" onClick={copySummary}>
                  Copy summary
                </Button>
                <Button variant="ghost" size="sm" onClick={resetDefaults}>
                  Reset defaults
                </Button>
              </div>

              <hr className="border-muted/30 my-5" />
              <SectionLabel>Save &amp; share</SectionLabel>

              <Field
                label="Saved analyses"
                helper="Saved analyses live in this browser only. Use a share link or Export JSON to move one between devices."
              >
                <select
                  className={INPUT_CLS}
                  value={selectedId}
                  disabled={sortedSaved.length === 0}
                  aria-label="Saved analyses"
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {sortedSaved.length === 0 ? (
                    <option value="">No saved analyses yet</option>
                  ) : (
                    <>
                      <option value="">Select a saved analysis…</option>
                      {sortedSaved.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                          {r.savedAt
                            ? ' — ' + new Date(r.savedAt).toLocaleDateString()
                            : ''}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadSelected}
                  disabled={!selectedId}
                >
                  Load
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteSelected}
                  disabled={!selectedId}
                >
                  Delete
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={saveAnalysis}>
                  Save analysis
                </Button>
                <Button variant="ghost" size="sm" onClick={copyShareLink}>
                  Copy share link
                </Button>
                <Button variant="ghost" size="sm" onClick={exportJson}>
                  Export JSON
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Import JSON
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) importJsonFile(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </Card>

            {/* ---------------- RESULTS ---------------- */}
            <Card padding="md">
              <Eyebrow tone="light" className="mb-5">
                Scenario comparison
              </Eyebrow>

              {errors ? (
                <div className="py-16 text-center text-body text-muted border border-dashed border-muted/40 rounded-lg">
                  <Eyebrow tone="muted" className="mb-2">
                    Awaiting valid inputs
                  </Eyebrow>
                  <p>Fix the highlighted inputs to see the comparison.</p>
                </div>
              ) : (
                <>
                  <Callout variant="lime-tint" className="mb-7">
                    <p className="text-body-sm text-body">
                      {result.summarySegments.map((s, i) =>
                        s.bold ? (
                          <strong key={i} className="text-ink">
                            {s.text}
                          </strong>
                        ) : (
                          <span key={i}>{s.text}</span>
                        ),
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-caption text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-lime" />
                        ≤ 4 weeks — feasible
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-charcoal-light" />
                        4–8 weeks — slow
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-critical" />
                        &gt; 8 weeks — not feasible
                      </span>
                    </div>
                  </Callout>

                  <div className="mb-8">
                    <h2 className="text-caption font-bold uppercase tracking-eyebrow text-subtle mb-3">
                      Side-by-side comparison
                    </h2>
                    <div className="overflow-x-auto border border-muted/30 rounded-md">
                      <table className="w-full border-collapse text-body-sm tabular-nums bg-white">
                        <thead>
                          <tr className="bg-subtle">
                            {['Lift', 'Target rate', 'n / arm', 'Total n', 'Time to sig', 'Δ RPU', 'Annual Δ revenue', 'Feasibility'].map(
                              (h, i) => (
                                <th
                                  key={h}
                                  className={`px-3 py-2.5 text-caption font-bold uppercase tracking-eyebrow text-muted border-b border-muted/40 whitespace-nowrap ${
                                    i === 0 ? 'text-left' : 'text-right'
                                  }`}
                                >
                                  {h}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {result.scenarios.map((s, i) => {
                            const tint =
                              s.cls === 'good'
                                ? 'bg-lime/10'
                                : s.cls === 'warn'
                                  ? 'bg-subtle'
                                  : 'bg-critical-tint';
                            return (
                              <tr
                                key={i}
                                className={`${tint} border-b border-muted/30 last:border-b-0`}
                              >
                                <td className="px-3 py-2.5 text-left whitespace-nowrap">
                                  <strong>+{s.lift.toFixed(2)} pp</strong>
                                  <br />
                                  <span className="text-[11px] text-subtle">
                                    +{s.relLift.toFixed(1)}% rel.
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                  {fmtPct(s.targetRate, 2)}
                                </td>
                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                  {fmtNum(s.nPerArm)}
                                </td>
                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                  {fmtNum(s.totalN)}
                                </td>
                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                  <strong>{fmtDays(s.daysToSig)}</strong>
                                  <br />
                                  <span className="text-[11px] text-subtle">
                                    ≈ {s.weeksToSig.toFixed(1)} wk
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                  {fmtUSD(s.incRpu, 3)}
                                </td>
                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                  <strong>{fmtUSD(s.scaledAnnual, 0)}</strong>
                                  <br />
                                  <span className="text-[11px] text-subtle">
                                    {fmtUSD(s.scaledWeekly, 0)}/wk
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                  <VerdictPill cls={s.cls} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h2 className="text-caption font-bold uppercase tracking-eyebrow text-subtle mb-3">
                      Time to significance — visual
                    </h2>
                    <LiftChart scenarios={result.scenarios} />
                  </div>

                  <div>
                    <h2 className="text-caption font-bold uppercase tracking-eyebrow text-subtle mb-3">
                      Shared assumptions
                    </h2>
                    <StatRow
                      label="Baseline rate"
                      value={fmtPct(result.inputs.baselineRate, 2)}
                    />
                    <StatRow
                      label="Weekly traffic (total)"
                      value={`${fmtNum(result.inputs.weeklyTraffic)} / wk`}
                    />
                    <StatRow
                      label="Variations"
                      value={result.inputs.numVariations}
                    />
                    <StatRow
                      label="Traffic per arm / week"
                      value={`${fmtNum(result.trafficPerArmWeek)} / wk`}
                    />
                    <StatRow
                      label="Implied KPI value"
                      value={`${fmtUSD(result.kpiValue)}  (${fmtUSD(result.inputs.focValue, 0)} × ${fmtPct(result.inputs.kpiToFoc, 1)})`}
                    />
                    <StatRow
                      label="α (per comparison, Bonferroni-adjusted)"
                      value={`${result.alphaAdj.toFixed(4)} (raw α = ${result.alpha.toFixed(2)}, ${result.numComparisons} comparison${result.numComparisons === 1 ? '' : 's'})`}
                    />
                    <StatRow
                      label="z(α/2) · z(β)"
                      value={`${result.zA.toFixed(3)} · ${result.zB.toFixed(3)}`}
                    />
                  </div>
                </>
              )}
            </Card>
          </div>

          <div className="mt-5">
            <Methodology />
          </div>
        </div>
      </section>

      <div
        aria-live="polite"
        role="status"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-modal bg-charcoal text-white px-4 py-2.5 rounded-md shadow-cardHover text-body-sm transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          toastMsg
            ? 'translate-y-0 opacity-100'
            : 'translate-y-[120px] opacity-0 pointer-events-none'
        }`}
      >
        {toastMsg || ' '}
      </div>
    </>
  );
}
