"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { IntakeRecord, RiceInputs } from "@/lib/intake/types";
import { FIELD_LABELS, LONG_FIELDS, SELECT_FIELDS } from "@/lib/intake/client/labels";
import {
  Button,
  Card,
  Eyebrow,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import Lightbox from "@/components/ui/Lightbox";

interface Taxonomy {
  lineOfBusiness: string[];
  journeySegment: string[];
  endUserPlatform: string[];
  requestType: string[];
}
interface SubmitResult {
  issueKey?: string;
  blocked?: { field: string; reason: string; message: string }[];
  warnings: string[];
}

// One organized, inline-editable view of the brief. Each piece of info appears
// once; the user edits any field in place. The Jira description is built from
// these fields at submit, so what's shown is what's filed.
const GROUPS: { title: string; fields: string[] }[] = [
  {
    title: "Classification",
    fields: [
      "lineOfBusiness",
      "journeySegment",
      "endUserPlatform",
      "requestType",
      "pageOrUrl",
      "targetAudience",
    ],
  },
  {
    title: "Context",
    fields: ["businessContext", "supportingEvidence", "targetImprovement"],
  },
  {
    title: "Metrics",
    fields: [
      "primarySuccessMetric",
      "secondarySuccessMetrics",
      "guardrailMetrics",
      "baselineMetrics",
    ],
  },
  { title: "Timeline", fields: ["desiredLaunchTiming", "resultsNeededBy"] },
  {
    title: "Variations & design",
    fields: ["variationIdeas", "designResearchGuidance"],
  },
  {
    title: "Dependencies & open questions",
    fields: ["technicalDependencies", "openQuestions"],
  },
  { title: "Submitter", fields: ["submitterName", "submitterEmail", "submitterTeam"] },
];

export default function ReviewClient({ id }: { id: string }) {
  const router = useRouter();
  const [intake, setIntake] = useState<IntakeRecord | null>(null);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [env, setEnv] = useState<{ jiraConfigured: boolean } | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string; caption?: string } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const [i, c] = await Promise.all([
        fetch(`/api/intake/${id}`).then((x) => x.json()),
        fetch("/api/intake/config").then((x) => x.json()),
      ]);
      setIntake(i.intake);
      setTaxonomy(c.config.taxonomy);
      setEnv(c.env);
    })();
  }, [id]);

  const setField = (key: string, value: string) => {
    setSavedAt(false);
    setIntake((prev) => (prev ? { ...prev, fields: { ...prev.fields, [key]: value } } : prev));
  };
  const setRice = (key: keyof RiceInputs, value: string) => {
    setSavedAt(false);
    setIntake((prev) => {
      if (!prev) return prev;
      const numeric: (keyof RiceInputs)[] = ["reach", "impact", "confidence", "effort"];
      const v = numeric.includes(key) ? (value === "" ? null : Number(value)) : value || null;
      return { ...prev, fields: { ...prev.fields, rice: { ...prev.fields.rice, [key]: v } } };
    });
  };

  const persist = useCallback(async (): Promise<IntakeRecord | null> => {
    if (!intake) return null;
    const res = await fetch(`/api/intake/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: intake.fields, rice: intake.fields.rice }),
    });
    const data = await res.json();
    if (data.intake) {
      setIntake(data.intake);
      return data.intake;
    }
    return null;
  }, [intake, id]);

  async function save() {
    setBusy("save");
    setError(null);
    try {
      await persist();
      setSavedAt(true);
    } finally {
      setBusy(null);
    }
  }

  // Persist current edits, then re-author the Summary + Hypothesis (and brief
  // sections) from the latest fields so added context is reflected.
  async function regenerate() {
    setBusy("regen");
    setError(null);
    try {
      const saved = await persist();
      if (!saved) return;
      const res = await fetch(`/api/intake/brief/${id}`, {
        method: "POST",
        body: JSON.stringify({ regenerate: true }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      if (data.intake) {
        setIntake(data.intake);
        setSavedAt(true);
      }
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setBusy("submit");
    setError(null);
    setResult(null);
    try {
      await persist();
      const res = await fetch(`/api/intake/jira/submit/${id}`, { method: "POST", body: "{}" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      const r: SubmitResult = data.result;
      setResult(r);
      if (r.issueKey) router.push(`/intake/confirm/${id}`);
    } finally {
      setBusy(null);
    }
  }

  const loading = !intake || !taxonomy;
  const rice = intake?.fields.rice;
  const blocked = result?.blocked ?? [];
  const fv = (k: string) =>
    ((intake?.fields as unknown as Record<string, unknown>)?.[k] ?? "") as string;

  return (
    <>
      <PageHeader
        dark
        eyebrow="Review"
        title="Review & edit brief"
        intro="Edit anything inline. What you see here is exactly what gets filed to Jira."
      />
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-6">
            <Button onClick={() => router.push("/intake")} variant="ghost" size="sm">
              ← Back to chat
            </Button>
          </div>

          {loading ? (
            <p className="text-body-sm text-muted">Loading brief…</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                {/* Title + summary */}
                <Card className="animate-fade-up">
                  <Field label="Brief title" htmlFor="briefTitle" className="mb-4">
                    <Input
                      id="briefTitle"
                      value={fv("briefTitle")}
                      onChange={(e) => setField("briefTitle", e.target.value)}
                      className="text-body font-semibold"
                    />
                  </Field>
                  <Field label="Summary" htmlFor="briefSummary" className="mb-4">
                    <Textarea
                      id="briefSummary"
                      value={fv("briefSummary")}
                      onChange={(e) => setField("briefSummary", e.target.value)}
                      rows={4}
                    />
                    <p className="mt-1.5 text-caption text-subtle">
                      One short narrative covering the context, the desired outcome, and any
                      supporting evidence.
                    </p>
                  </Field>
                  <Field label="Hypothesis" htmlFor="hypothesis">
                    <Textarea
                      id="hypothesis"
                      value={fv("hypothesis")}
                      onChange={(e) => setField("hypothesis", e.target.value)}
                      rows={3}
                      placeholder="By doing X, we will impact Y, because Z, leading to [desired outcome]."
                    />
                  </Field>
                </Card>

                {/* Grouped fields */}
                {GROUPS.map((group) => (
                  <Card key={group.title} className="animate-fade-up">
                    <Eyebrow tone="muted" className="mb-4">
                      {group.title}
                    </Eyebrow>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {group.fields.map((key) => {
                        const taxKey = SELECT_FIELDS[key as keyof typeof SELECT_FIELDS];
                        const long = LONG_FIELDS.has(key);
                        return (
                          <Field
                            key={key}
                            label={FIELD_LABELS[key] ?? key}
                            htmlFor={`f-${key}`}
                            className={long ? "sm:col-span-2" : ""}
                          >
                            {taxKey ? (
                              <Select
                                id={`f-${key}`}
                                value={fv(key)}
                                onChange={(e) => setField(key, e.target.value)}
                              >
                                <option value="">—</option>
                                {taxonomy![taxKey].map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </Select>
                            ) : long ? (
                              <Textarea
                                id={`f-${key}`}
                                value={fv(key)}
                                onChange={(e) => setField(key, e.target.value)}
                                rows={3}
                              />
                            ) : (
                              <Input
                                id={`f-${key}`}
                                value={fv(key)}
                                onChange={(e) => setField(key, e.target.value)}
                              />
                            )}
                          </Field>
                        );
                      })}
                    </div>
                  </Card>
                ))}

                {/* RICE 1-10 */}
                <Card className="animate-fade-up">
                  <div className="mb-1 flex items-center justify-between">
                    <Eyebrow tone="muted">RICE (each scored 1–10)</Eyebrow>
                    <span className="rounded-sm bg-lime/10 px-2.5 py-1 text-caption font-medium text-accent">
                      Preliminary score: <strong>{rice!.score ?? "—"}</strong>
                    </span>
                  </div>
                  <p className="mb-4 text-caption text-subtle">
                    Each attribute is scored 1 (very low) to 10 (very high) from the assumptions.
                    Edit any value or rationale.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["reach", "Reach", "reachRationale"],
                        ["impact", "Impact", "impactRationale"],
                        ["confidence", "Confidence", "confidenceRationale"],
                        ["effort", "Effort", "effortRationale"],
                      ] as const
                    ).map(([k, label, rk]) => (
                      <div key={k} className="rounded-md border border-muted/30 bg-subtle p-3">
                        <div className="mb-1.5 flex items-center justify-between">
                          <label className="text-caption font-semibold text-muted">{label}</label>
                          <div className="flex items-center gap-1 text-caption text-subtle">
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              step={1}
                              value={rice![k] ?? ""}
                              onChange={(e) => setRice(k, e.target.value)}
                              className="w-14 px-2 py-1 text-center font-semibold"
                            />
                            <span>/ 10</span>
                          </div>
                        </div>
                        <Input
                          placeholder="rationale"
                          value={(rice![rk] as string) ?? ""}
                          onChange={(e) => setRice(rk, e.target.value)}
                          className="text-caption"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-caption text-subtle">
                    Preliminary only, not a final prioritization decision.
                  </p>
                </Card>

                {/* Attachments — screenshots, generated mockups, context documents */}
                {intake!.attachments.length > 0 &&
                  (() => {
                    const shots = intake!.attachments.filter((a) => a.kind === "screenshot");
                    const mocks = intake!.attachments.filter((a) => a.kind === "mockup");
                    const docs = intake!.attachments.filter((a) => a.kind === "document");
                    const Thumb = ({ att }: { att: (typeof intake.attachments)[number] }) => (
                      <figure>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/intake/${id}/attachments/${att.id}`}
                          alt={att.caption ?? att.filename}
                          onClick={() =>
                            setLightbox({
                              src: `/api/intake/${id}/attachments/${att.id}`,
                              alt: att.caption ?? att.filename,
                              caption: att.caption,
                            })
                          }
                          className="w-full cursor-zoom-in rounded border border-muted/40 bg-white object-contain"
                        />
                        {att.caption && (
                          <figcaption className="mt-1 text-caption text-subtle">
                            {att.caption}
                          </figcaption>
                        )}
                      </figure>
                    );
                    return (
                      <Card className="animate-fade-up">
                        <Eyebrow tone="muted" className="mb-3">
                          Screenshots &amp; mockups
                        </Eyebrow>
                        <p className="mb-4 text-caption text-subtle">
                          These files are attached to the Jira ticket on submit.
                        </p>
                        {shots.length > 0 && (
                          <div className="mb-4">
                            <p className="mb-2 text-caption font-semibold text-muted">Screenshots</p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {shots.map((a) => (
                                <Thumb key={a.id} att={a} />
                              ))}
                            </div>
                          </div>
                        )}
                        {mocks.length > 0 && (
                          <div className="mb-4">
                            <p className="mb-2 text-caption font-semibold text-muted">
                              Suggested mockups
                            </p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {mocks.map((a) => (
                                <Thumb key={a.id} att={a} />
                              ))}
                            </div>
                          </div>
                        )}
                        {docs.length > 0 && (
                          <div>
                            <p className="mb-2 text-caption font-semibold text-muted">Documents</p>
                            <ul className="space-y-1.5">
                              {docs.map((a) => (
                                <li
                                  key={a.id}
                                  className="truncate rounded border border-muted/40 bg-subtle px-2.5 py-1.5 text-caption text-body"
                                  title={a.filename}
                                >
                                  {a.filename}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </Card>
                    );
                  })()}
              </div>

              {/* Actions */}
              <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                <Card padding="sm">
                  <Eyebrow tone="muted" className="mb-3">
                    Submit
                  </Eyebrow>
                  <Button
                    onClick={submit}
                    disabled={!!busy}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    {busy === "submit" ? "Filing to Jira…" : "Submit to Jira →"}
                  </Button>
                  <Button
                    onClick={regenerate}
                    disabled={!!busy}
                    variant="ghost"
                    size="md"
                    className="mt-2 w-full"
                  >
                    {busy === "regen" ? "Regenerating…" : "Regenerate brief"}
                  </Button>
                  <p className="mt-1.5 text-caption text-subtle">
                    Re-writes the Summary and Hypothesis from your latest edits and added context.
                  </p>
                  <Button
                    onClick={save}
                    disabled={!!busy}
                    variant="secondary"
                    size="md"
                    className="mt-3 w-full"
                  >
                    {busy === "save" ? "Saving…" : savedAt ? "Saved ✓" : "Save draft"}
                  </Button>
                  {savedAt && (
                    <p className="mt-2 text-caption text-subtle">
                      Saved to your{" "}
                      <a href="/intake/drafts" className="focus-ring rounded text-accent hover:underline">
                        drafts
                      </a>
                      — come back anytime to finish it.
                    </p>
                  )}
                  <p className="mt-3 text-caption text-subtle">
                    {env?.jiraConfigured
                      ? "Creates a Jira work item in the team's Intake column for triage."
                      : "Jira isn't configured in this environment."}
                  </p>
                </Card>

                {error && (
                  <div className="rounded-md border border-critical-border bg-critical-tint p-4 text-body-sm text-critical-text">
                    {error}
                  </div>
                )}

                {blocked.length > 0 && (
                  <div className="rounded-md border border-critical-border bg-critical-tint p-4 text-body-sm">
                    <div className="mb-1 text-eyebrow uppercase tracking-eyebrow text-critical-text">
                      Resolve before submitting
                    </div>
                    <ul className="list-disc space-y-1 pl-4 text-critical-text">
                      {blocked.map((b, i) => (
                        <li key={i}>{b.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          )}
        </div>
      </section>

      <Lightbox
        src={lightbox?.src ?? null}
        alt={lightbox?.alt}
        caption={lightbox?.caption}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
