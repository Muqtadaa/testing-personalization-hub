"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Eyebrow, Field, Input, PageHeader, Textarea } from "@/components/ui";

interface Env {
  dbConfigured: boolean;
  jiraConfigured: boolean;
  llmKind: string;
  dryRunDefault: boolean;
}

interface RiceAnchor {
  reach?: number | null;
  impact?: number | null;
  note?: string;
}

// Minimal shape we read/write structurally. The raw JSON textarea remains the
// source of truth; these editors just produce a new config object and re-serialize.
interface PartialConfig {
  taxonomy?: { lineOfBusiness?: string[]; journeySegment?: string[] };
  fieldMappings?: { intakeField: string; valueMap?: Record<string, string> }[];
  rice?: { journeyDefaults?: Record<string, Record<string, RiceAnchor>> };
  brandContext?: Record<string, string>;
  programContext?: string;
}

const LOB_EXCLUDED = ["Multi-brand", "Unknown"];
const JOURNEY_EXCLUDED = ["Cross-journey", "Unknown"];

function mappableValues(
  parsed: PartialConfig | null,
  intakeField: string,
  taxonomyKey: "lineOfBusiness" | "journeySegment",
  excluded: string[],
): string[] {
  const m = parsed?.fieldMappings?.find((x) => x.intakeField === intakeField);
  if (m?.valueMap) return Object.keys(m.valueMap);
  const tax = parsed?.taxonomy?.[taxonomyKey] ?? [];
  return tax.filter((v) => !excluded.includes(v));
}

export default function AdminConfigPage() {
  const [text, setText] = useState("");
  const [env, setEnv] = useState<Env | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [metaBusy, setMetaBusy] = useState(false);
  const [meta, setMeta] = useState<unknown>(null);

  useEffect(() => {
    (async () => {
      const c = await fetch("/api/intake/config").then((x) => x.json());
      setText(JSON.stringify(c.config, null, 2));
      setEnv(c.env);
    })();
  }, []);

  // Parse the textarea as the single source of truth; structured editors render
  // from this and write back by re-serializing. Null while JSON is mid-edit/invalid.
  const parsed = useMemo<PartialConfig | null>(() => {
    if (!text.trim()) return null;
    try {
      return JSON.parse(text) as PartialConfig;
    } catch {
      return null;
    }
  }, [text]);

  const lobs = useMemo(
    () => mappableValues(parsed, "lineOfBusiness", "lineOfBusiness", LOB_EXCLUDED),
    [parsed],
  );
  const journeys = useMemo(
    () => mappableValues(parsed, "journeySegment", "journeySegment", JOURNEY_EXCLUDED),
    [parsed],
  );

  // Apply a structural mutation to the parsed config and push it back into `text`.
  function updateConfig(mutate: (c: PartialConfig) => void) {
    if (!parsed) return;
    const next = JSON.parse(JSON.stringify(parsed)) as PartialConfig;
    mutate(next);
    setText(JSON.stringify(next, null, 2));
  }

  function setAnchor(lob: string, journey: string, field: keyof RiceAnchor, raw: string) {
    updateConfig((c) => {
      c.rice ??= {};
      c.rice.journeyDefaults ??= {};
      c.rice.journeyDefaults[lob] ??= {};
      c.rice.journeyDefaults[lob][journey] ??= {};
      const cell = c.rice.journeyDefaults[lob][journey];
      if (field === "note") {
        if (raw.trim()) cell.note = raw;
        else delete cell.note;
      } else {
        const n = raw.trim() === "" ? null : Math.max(1, Math.min(10, Number(raw)));
        cell[field] = Number.isNaN(n as number) ? null : n;
      }
      // Drop fully-empty cells to keep the config tidy.
      const cur = c.rice.journeyDefaults[lob][journey];
      if (cur.reach == null && cur.impact == null && !cur.note?.trim()) {
        delete c.rice.journeyDefaults[lob][journey];
        if (Object.keys(c.rice.journeyDefaults[lob]).length === 0) {
          delete c.rice.journeyDefaults[lob];
        }
      }
    });
  }

  function setBrandContext(lob: string, value: string) {
    updateConfig((c) => {
      c.brandContext ??= {};
      if (value.trim()) c.brandContext[lob] = value;
      else delete c.brandContext[lob];
    });
  }

  function setProgramContext(value: string) {
    updateConfig((c) => {
      c.programContext = value;
    });
  }

  async function save() {
    setStatus(null);
    let parsedToSave: unknown;
    try {
      parsedToSave = JSON.parse(text);
    } catch {
      setStatus("Invalid JSON.");
      return;
    }
    const res = await fetch("/api/intake/config", {
      method: "PUT",
      body: JSON.stringify({ config: parsedToSave }),
    });
    const data = await res.json();
    if (data.error) {
      setStatus(`Error: ${data.error}`);
    } else {
      setText(JSON.stringify(data.config, null, 2));
      setStatus(
        env?.dbConfigured
          ? "Saved to Supabase."
          : "Validated, but not persisted. Supabase is not configured.",
      );
    }
  }

  async function refreshMeta() {
    setMetaBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/intake/jira/metadata", { method: "POST" });
      const data = await res.json();
      if (data.error) setStatus(`Metadata error: ${data.error}`);
      else setMeta(data.fields);
    } finally {
      setMetaBusy(false);
    }
  }

  const anchorOf = (lob: string, journey: string): RiceAnchor =>
    parsed?.rice?.journeyDefaults?.[lob]?.[journey] ?? {};

  return (
    <>
      <PageHeader
        dark
        eyebrow="Admin"
        title="Configuration"
        intro="Jira target, field mappings & value maps, taxonomy, RICE thresholds, routing rules, required fields, metric library, labels, journey anchors, and brand / program context. Use the editors below or edit the raw JSON, then Save config."
      />
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 space-y-5">
          {env && (
            <div className="flex flex-wrap gap-2">
              <StatusPill ok={env.dbConfigured} label={env.dbConfigured ? "DB connected" : "DB off"} />
              <StatusPill
                ok={env.jiraConfigured}
                label={env.jiraConfigured ? "Jira configured" : "Jira off"}
              />
              <StatusPill
                ok={env.llmKind === "anthropic"}
                label={env.llmKind === "anthropic" ? "Claude" : "Mock LLM"}
              />
              <StatusPill
                ok={!env.dryRunDefault}
                label={env.dryRunDefault ? "Dry-run default" : "Live submit"}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={save} variant="primary" size="md">
              Save config
            </Button>
            <Button onClick={refreshMeta} disabled={metaBusy} variant="secondary" size="md">
              {metaBusy ? "Discovering…" : "Discover live Jira fields"}
            </Button>
            {status && <span className="self-center text-body-sm text-muted">{status}</span>}
          </div>

          {!parsed && text.trim() && (
            <p className="rounded-md border border-critical-border bg-critical-tint px-3 py-2 text-body-sm text-critical-text">
              The raw JSON below is not valid right now, so the structured editors are hidden. Fix
              the JSON to bring them back.
            </p>
          )}

          {/* RICE journey anchors */}
          {parsed && (
            <Card padding="sm">
              <Eyebrow tone="muted" className="mb-1">
                RICE journey anchors
              </Eyebrow>
              <p className="mb-4 max-w-3xl text-body-sm text-muted">
                Starting Reach / Impact values (1–10) by Line of Business and Journey. The assistant
                begins from these and adjusts to the specific request; they are anchors, not final
                scores. Leave blank for no anchor. Confidence and Effort are always scored per
                request.
              </p>
              {lobs.length === 0 || journeys.length === 0 ? (
                <p className="text-body-sm text-muted">
                  No mappable Line of Business / Journey values found in the config.
                </p>
              ) : (
                <div className="space-y-6">
                  {lobs.map((lob) => (
                    <div key={lob}>
                      <h2 className="mb-2 text-body-sm font-semibold text-charcoal">{lob}</h2>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-body-sm">
                          <thead>
                            <tr className="text-left text-subtle">
                              <th className="py-1 pr-3 font-medium">Journey</th>
                              <th className="py-1 pr-3 font-medium">Reach (1–10)</th>
                              <th className="py-1 pr-3 font-medium">Impact (1–10)</th>
                              <th className="py-1 pr-3 font-medium">Note (optional)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {journeys.map((journey) => {
                              const a = anchorOf(lob, journey);
                              return (
                                <tr key={journey} className="border-t border-muted/30">
                                  <td className="py-1.5 pr-3 text-body">{journey}</td>
                                  <td className="py-1.5 pr-3">
                                    <NumCell
                                      value={a.reach}
                                      onChange={(v) => setAnchor(lob, journey, "reach", v)}
                                      label={`${lob} ${journey} reach anchor`}
                                    />
                                  </td>
                                  <td className="py-1.5 pr-3">
                                    <NumCell
                                      value={a.impact}
                                      onChange={(v) => setAnchor(lob, journey, "impact", v)}
                                      label={`${lob} ${journey} impact anchor`}
                                    />
                                  </td>
                                  <td className="py-1.5 pr-3">
                                    <Input
                                      type="text"
                                      value={a.note ?? ""}
                                      onChange={(e) =>
                                        setAnchor(lob, journey, "note", e.target.value)
                                      }
                                      placeholder="e.g. broad homepage traffic"
                                      aria-label={`${lob} ${journey} anchor note`}
                                      className="min-w-48 px-2 py-1"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Brand & program context */}
          {parsed && (
            <Card padding="sm">
              <Eyebrow tone="muted" className="mb-1">
                Brand &amp; program context
              </Eyebrow>
              <p className="mb-4 max-w-3xl text-body-sm text-muted">
                Reference context the assistant uses to make brand-aware, feasibility-aware
                suggestions. Program context is shared across brands; brand context is injected when
                that Line of Business is selected. Plain text, no figures the user did not provide.
              </p>
              <div className="space-y-4">
                <ContextArea
                  label="Program context (shared: tech stack, measurement, feasibility)"
                  value={parsed.programContext ?? ""}
                  onChange={setProgramContext}
                />
                {lobs.map((lob) => (
                  <ContextArea
                    key={lob}
                    label={`${lob} brand context`}
                    value={parsed.brandContext?.[lob] ?? ""}
                    onChange={(v) => setBrandContext(lob, v)}
                  />
                ))}
              </div>
            </Card>
          )}

          <details className="rounded-lg border border-muted/30 bg-white shadow-card">
            <summary className="cursor-pointer px-5 py-3 text-body-sm font-medium text-charcoal">
              Raw JSON (advanced, full config)
            </summary>
            <div className="px-5 pb-5">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck={false}
                aria-label="Raw configuration JSON"
                className="h-[55vh] resize-none p-4 font-mono text-xs"
              />
            </div>
          </details>

          {meta != null && (
            <Card padding="sm">
              <Eyebrow tone="muted" className="mb-2">
                Live Jira field metadata
              </Eyebrow>
              <pre className="max-h-80 overflow-auto rounded-md bg-subtle p-3 text-xs text-body">
                {JSON.stringify(meta, null, 2)}
              </pre>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}

function NumCell({
  value,
  onChange,
  label,
}: {
  value: number | null | undefined;
  onChange: (raw: string) => void;
  label: string;
}) {
  return (
    <Input
      type="number"
      min={1}
      max={10}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="—"
      aria-label={label}
      className="w-20 px-2 py-1"
    />
  );
}

function ContextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = "ctx-" + label.replace(/\W+/g, "-").toLowerCase();
  return (
    <Field label={label} htmlFor={id}>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        rows={6}
        className="text-caption"
      />
    </Field>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`text-eyebrow uppercase tracking-eyebrow rounded-sm px-2 py-1 ${
        ok ? "bg-lime/10 text-accent" : "bg-subtle text-subtle"
      }`}
    >
      {label}
    </span>
  );
}
