"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IntakeRecord } from "@/lib/intake/types";
import {
  BRIEF_GAP_DISPLAY,
  RICE_GAP_DISPLAY,
  type TicketReview,
} from "@/lib/roadmap/review/types";
import { Markdown } from "@/lib/intake/client/Markdown";
import { Badge, Button, Callout, Card, Eyebrow, Input, Textarea } from "@/components/ui";

interface TicketContext {
  key: string;
  summary: string;
  brief: string | null;
  url: string;
}

interface UpdateResult {
  dryRun: boolean;
  updated?: boolean;
  issueKey: string;
  issueUrl: string;
  brief: { title: string; summary: string; sections: { heading: string; body: string }[] };
  payloadSummary: { label: string; jiraFieldId: string; value: string }[];
  warnings: string[];
}

export default function ImproveClient({ issueKey }: { issueKey: string }) {
  const router = useRouter();
  const [intake, setIntake] = useState<IntakeRecord | null>(null);
  // Captured once on load; conversation turns re-read the record from the DB,
  // which may not carry improveGaps (optional column), so we hold onto it here.
  const [gaps, setGaps] = useState<TicketReview | null>(null);
  const [ticket, setTicket] = useState<TicketContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { selected: string[]; custom: string }>>({});
  const [step, setStep] = useState(0);
  // Update preview / confirm.
  const [preview, setPreview] = useState<UpdateResult | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  // When the brief is ready the input is locked (the next step is Review/Update);
  // "Add more detail" re-opens it for one more turn.
  const [moreDetail, setMoreDetail] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const questionSig = intake?.pendingQuestions.map((q) => q.id).join("|") ?? "";
  useEffect(() => {
    setStep(0);
  }, [questionSig]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/intake/improve/${issueKey}`, { method: "POST" });
        const data = await res.json();
        if (data.error) setLoadError(data.error);
        else {
          setIntake(data.intake);
          if (data.intake?.improveGaps) setGaps(data.intake.improveGaps);
          if (data.ticket) setTicket(data.ticket);
        }
      } catch (e) {
        setLoadError((e as Error).message);
      }
    })();
  }, [issueKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [intake?.messages.length, intake?.pendingQuestions.length]);

  async function sendMessage(text: string) {
    if (!text.trim() || !intake || busy) return;
    setBusy(true);
    setAnswers({});
    setPreview(null);
    setMoreDetail(false);
    setIntake({
      ...intake,
      messages: [...intake.messages, { role: "user", content: text }],
      pendingQuestions: [],
    });
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        body: JSON.stringify({ id: intake.id, message: text }),
      });
      const data = await res.json();
      if (data.intake) setIntake(data.intake);
    } finally {
      setBusy(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage(text);
  }

  function toggleOption(q: { id: string; multiSelect: boolean }, value: string) {
    setAnswers((prev) => {
      const cur = prev[q.id] ?? { selected: [], custom: "" };
      let selected: string[];
      if (q.multiSelect) {
        selected = cur.selected.includes(value)
          ? cur.selected.filter((v) => v !== value)
          : [...cur.selected, value];
      } else {
        selected = cur.selected.includes(value) ? [] : [value];
      }
      return { ...prev, [q.id]: { ...cur, selected } };
    });
  }

  function setCustom(id: string, custom: string) {
    setAnswers((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { selected: [] }), custom } }));
  }

  function submitAnswers() {
    if (!intake?.pendingQuestions.length) return;
    const lines = intake.pendingQuestions.map((q) => {
      const a = answers[q.id] ?? { selected: [], custom: "" };
      const parts = [...a.selected];
      if (a.custom.trim()) parts.push(a.custom.trim());
      return `- ${q.question} ${parts.length ? `→ ${parts.join(", ")}` : "→ (skipped)"}`;
    });
    sendMessage(`My answers:\n${lines.join("\n")}`);
  }

  const hasAnyAnswer =
    intake?.pendingQuestions.some((q) => {
      const a = answers[q.id];
      return a && (a.selected.length > 0 || a.custom.trim().length > 0);
    }) ?? false;

  const noPending = (intake?.pendingQuestions.length ?? 0) === 0;
  const hasConversed = (intake?.messages.filter((m) => m.role === "user").length ?? 0) > 0;
  const showReady = !!intake && noPending && !busy && hasConversed;
  // Lock the free-text input once the brief is ready, unless the user explicitly
  // chooses to add more detail.
  const inputLocked = showReady && !moreDetail;

  // Step 1: dry-run preview of the update.
  async function reviewChanges() {
    if (!intake || updating) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/intake/jira/update/${intake.id}`, {
        method: "POST",
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json();
      if (data.error) setUpdateError(data.error);
      else setPreview(data.result as UpdateResult);
    } catch (e) {
      setUpdateError((e as Error).message);
    } finally {
      setUpdating(false);
    }
  }

  // Step 2: commit the real update (uses server default; real write needs
  // JIRA_DRY_RUN=false). On a real success, return to the roadmap to re-sync.
  async function confirmUpdate() {
    if (!intake || updating) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/intake/jira/update/${intake.id}`, {
        method: "POST",
        body: JSON.stringify({ dryRun: false }),
      });
      const data = await res.json();
      if (data.error) {
        setUpdateError(data.error);
        return;
      }
      const result = data.result as UpdateResult;
      if (result.dryRun) {
        // Real writes are disabled on the server; surface why.
        setPreview(result);
        setUpdateError(
          "Real updates are disabled on this environment (JIRA_DRY_RUN). The preview above is exactly what would be written.",
        );
        return;
      }
      router.push(`/backlog?synced=${encodeURIComponent(result.issueKey)}`);
    } catch (e) {
      setUpdateError((e as Error).message);
    } finally {
      setUpdating(false);
    }
  }

  if (loadError) {
    return (
      <Callout variant="plain" eyebrow="Couldn't load ticket">
        <p className="text-body-sm text-critical-text">{loadError}</p>
        <div className="mt-3">
          <Button as="a" href="/backlog" variant="secondary" size="sm">
            ← Back to roadmap
          </Button>
        </div>
      </Callout>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card padding="none" className="flex h-[68vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-muted/30 px-5 py-4">
          <h2 className="text-h4 text-charcoal">Improve {issueKey}</h2>
          <Badge variant="neutral" size="sm">
            Improve mode
          </Badge>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {!intake && <p className="text-body-sm text-subtle">Loading the ticket…</p>}
          {intake?.messages.map((m, i) => (
            <div
              key={i}
              className={`flex animate-fade-up ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-md px-4 py-2.5 text-body-sm leading-relaxed ${
                  m.role === "user"
                    ? "whitespace-pre-wrap bg-charcoal text-on-dark"
                    : "bg-subtle text-body"
                }`}
              >
                {m.role === "user" ? m.content : <Markdown content={m.content} />}
              </div>
            </div>
          ))}

          {!busy &&
            intake &&
            intake.pendingQuestions.length > 0 &&
            (() => {
              const qs = intake.pendingQuestions;
              const idx = Math.min(step, qs.length - 1);
              const q = qs[idx];
              const a = answers[q.id] ?? { selected: [], custom: "" };
              const isLast = idx >= qs.length - 1;
              const answeredOf = (qq: { id: string }) => {
                const aa = answers[qq.id];
                return !!aa && (aa.selected.length > 0 || aa.custom.trim().length > 0);
              };
              const answeredCount = qs.filter(answeredOf).length;
              return (
                <div className="animate-fade-up rounded-lg border border-lime/40 bg-lime/[0.06] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Eyebrow tone="light">Close the gaps</Eyebrow>
                    <span className="text-caption font-medium tabular-nums text-muted">
                      Question {idx + 1} of {qs.length}
                    </span>
                  </div>
                  <div className="mb-4 flex gap-1.5">
                    {qs.map((qq, qi) => (
                      <button
                        key={qq.id}
                        type="button"
                        onClick={() => setStep(qi)}
                        aria-label={`Go to question ${qi + 1}`}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                          qi === idx
                            ? "bg-lime"
                            : answeredOf(qq)
                              ? "bg-lime/55"
                              : "bg-muted/40 hover:bg-muted/60"
                        }`}
                      />
                    ))}
                  </div>
                  <div key={q.id} className="animate-fade-up">
                    <div className="mb-2.5 flex items-start gap-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-[11px] font-bold text-charcoal">
                        {idx + 1}
                      </span>
                      <p className="text-body-sm font-medium leading-snug text-charcoal">
                        {q.question}
                        {q.multiSelect && (
                          <span className="ml-2 text-caption font-normal text-subtle">
                            (select all that apply)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-7">
                      {q.options.map((opt) => {
                        const on = a.selected.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleOption(q, opt.value)}
                            title={opt.description}
                            className={`focus-ring rounded-md border px-3 py-1.5 text-body-sm transition duration-150 active:scale-[0.97] ${
                              on
                                ? "border-lime bg-lime/20 font-medium text-charcoal shadow-card"
                                : "border-muted/60 bg-white text-body hover:border-lime/60 hover:bg-lime/[0.04]"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    {q.allowCustom && (
                      <div className="mt-2 pl-7">
                        <Input
                          value={a.custom}
                          onChange={(e) => setCustom(q.id, e.target.value)}
                          placeholder="Other, or add detail…"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Button
                      onClick={() => setStep((s) => Math.max(0, s - 1))}
                      disabled={idx === 0}
                      variant="ghost"
                      size="sm"
                      className={idx === 0 ? "opacity-0" : ""}
                    >
                      ← Back
                    </Button>
                    <span className="text-caption tabular-nums text-subtle">
                      {answeredCount} of {qs.length} answered
                    </span>
                    {isLast ? (
                      <Button onClick={submitAnswers} disabled={!hasAnyAnswer} variant="primary" size="sm">
                        Submit answers →
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setStep((s) => Math.min(qs.length - 1, s + 1))}
                        variant="secondary"
                        size="sm"
                      >
                        Next →
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}

          {showReady && !preview && (
            <div className="animate-fade-up rounded-lg border border-lime/50 bg-lime/[0.06] p-5">
              <Eyebrow tone="light">Ready to update</Eyebrow>
              <p className="mt-2 text-body-sm leading-relaxed text-body">
                That addresses the flagged gaps. Review exactly what will be written to {issueKey} before
                it goes to Jira.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Button onClick={reviewChanges} disabled={updating} variant="primary" size="md">
                  {updating ? "Preparing…" : "Review changes →"}
                </Button>
                <Button
                  onClick={() => setMoreDetail(true)}
                  disabled={updating || moreDetail}
                  variant="ghost"
                  size="md"
                >
                  Add more detail
                </Button>
              </div>
            </div>
          )}

          {preview && (
            <div className="animate-fade-up rounded-lg border border-muted/40 bg-white p-5">
              <Eyebrow tone="muted">Update preview — {issueKey}</Eyebrow>
              <p className="mt-2 text-caption text-subtle">
                {preview.dryRun ? "Dry run — nothing written yet." : "Updated."} These fields will be
                written to the existing ticket. The reporter, status, and labels are left unchanged.
              </p>
              <ul className="mt-3 space-y-1.5 text-body-sm">
                {preview.payloadSummary.map((s) => (
                  <li key={s.jiraFieldId} className="flex gap-2">
                    <span className="shrink-0 font-medium text-charcoal">{s.label}:</span>
                    <span className="text-body">{s.value}</span>
                  </li>
                ))}
              </ul>
              {preview.warnings.length > 0 && (
                <ul className="mt-3 list-disc space-y-0.5 pl-4 text-caption text-muted">
                  {preview.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Button onClick={confirmUpdate} disabled={updating} variant="primary" size="md">
                  {updating ? "Updating…" : `Confirm & update ${issueKey} →`}
                </Button>
                <Button onClick={() => setPreview(null)} variant="ghost" size="md">
                  Keep editing
                </Button>
              </div>
            </div>
          )}

          {updateError && <p className="text-caption text-critical-text">{updateError}</p>}

          {busy && (
            <div className="flex animate-fade-up justify-start" role="status" aria-live="polite">
              <div className="flex items-center gap-2 rounded-md bg-subtle px-4 py-2.5">
                <span className="text-body-sm text-subtle">Thinking…</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-muted/30 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              disabled={busy || !intake || inputLocked}
              placeholder={
                busy
                  ? "Thinking…"
                  : inputLocked
                    ? "Brief is ready — review the changes to update the ticket."
                    : "Answer in your own words, or use the options above…"
              }
              className="flex-1 resize-none"
            />
            <Button
              onClick={send}
              disabled={busy || !input.trim() || inputLocked}
              variant="primary"
              size="md"
            >
              Send
            </Button>
          </div>
        </div>
      </Card>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <Card padding="sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-h4 text-charcoal">Needs attention</h2>
            {gaps && (
              <span className="text-caption font-semibold tabular-nums text-muted">
                {gaps.briefMissing.length + gaps.riceMissing.length}
              </span>
            )}
          </div>
          {gaps ? (
            <ul className="mt-3 space-y-2 text-body-sm">
              {gaps.briefMissing.map((g) => (
                <li key={g} className="flex items-center gap-2.5">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-critical/20 text-[10px] font-bold text-critical-text">
                    !
                  </span>
                  <span className="text-body">{BRIEF_GAP_DISPLAY[g]}</span>
                </li>
              ))}
              {gaps.riceMissing.map((g) => (
                <li key={g} className="flex items-center gap-2.5">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-critical/20 text-[10px] font-bold text-critical-text">
                    !
                  </span>
                  <span className="text-body">{RICE_GAP_DISPLAY[g]}</span>
                </li>
              ))}
              {gaps.briefMissing.length === 0 && gaps.riceMissing.length === 0 && (
                <li className="text-subtle">No gaps recorded.</li>
              )}
            </ul>
          ) : (
            <p className="mt-2 text-caption text-subtle">Loading…</p>
          )}
          <div className="mt-4 border-t border-muted/20 pt-4">
            <Button as="a" href="/backlog" variant="ghost" size="sm">
              ← Back to roadmap
            </Button>
          </div>
        </Card>

        {/* The ticket as it stands today, so the user can reference it while
            improving the brief. Read straight off Jira on load. */}
        <Card padding="sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-h4 text-charcoal">Current ticket</h2>
            {ticket && (
              <a
                href={ticket.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-caption font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded"
              >
                {ticket.key} →
              </a>
            )}
          </div>
          {ticket ? (
            <>
              <p className="mt-2 text-body-sm font-medium leading-snug text-charcoal">
                {ticket.summary || "(no summary)"}
              </p>
              <Eyebrow tone="muted" className="mt-3 mb-1">
                Current description
              </Eyebrow>
              {ticket.brief ? (
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded border border-muted/30 bg-subtle/50 p-2.5 text-caption leading-relaxed text-body">
                  {ticket.brief}
                </p>
              ) : (
                <p className="text-caption italic text-subtle">
                  This ticket has no description yet.
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-caption text-subtle">Loading…</p>
          )}
        </Card>
      </aside>
    </div>
  );
}
