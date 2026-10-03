"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IntakeRecord } from "@/lib/intake/types";
import { FIELD_LABELS, humanizeAssumption } from "@/lib/intake/client/labels";
import { Markdown } from "@/lib/intake/client/Markdown";
import {
  Badge,
  Button,
  Callout,
  Card,
  Eyebrow,
  Field,
  Input,
  PageHeader,
  Textarea,
} from "@/components/ui";
import Lightbox from "@/components/ui/Lightbox";
import {
  type AuthedUser,
  emailDomainAllowed,
  readAuthedUser,
  storeAuthedUser,
} from "@/lib/intake/auth";
import { createClient } from "@/lib/supabase/client";
import { authConfigured } from "@/lib/supabase/env";
import { nameFromEmail } from "@/lib/auth/displayName";

interface ConfigInfo {
  requiredFields: string[];
  secondaryFields: string[];
  env: { llmKind: string; jiraConfigured: boolean; dryRunDefault: boolean; dbConfigured: boolean };
}

// ---------------------------------------------------------------------------
// Gate: a simple name + email check before the intake on each new session.
// ---------------------------------------------------------------------------
export default function HomePage() {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      // Prefer the signed-in hub session (everyone is gated now). Fall back to a
      // remembered local identity when auth isn't configured (e.g. local dev).
      try {
        if (authConfigured()) {
          const supabase = createClient();
          const {
            data: { user: sUser },
          } = await supabase.auth.getUser();
          if (sUser?.email) {
            const u: AuthedUser = {
              name:
                (sUser.user_metadata?.name as string | undefined) ||
                (sUser.user_metadata?.full_name as string | undefined) ||
                nameFromEmail(sUser.email),
              email: sUser.email,
            };
            storeAuthedUser(u);
            setUser(u);
            setReady(true);
            return;
          }
        }
      } catch {
        // fall through to the local identity
      }
      setUser(readAuthedUser());
      setReady(true);
    })();
  }, []);

  return (
    <>
      <PageHeader
        dark
        compact={ready && !!user}
        eyebrow="Testing & Personalization"
        title="Intake & Brief Builder"
        intro="Describe your idea in plain language. I'll ask a few follow-ups, shape it into a brief, and prepare a Jira ticket for your review."
      />
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {!ready ? null : !user ? (
            <AuthGate onAuthed={setUser} />
          ) : (
            <IntakeChat user={user} />
          )}
        </div>
      </section>
    </>
  );
}

function AuthGate({ onAuthed }: { onAuthed: (u: AuthedUser) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [denied, setDenied] = useState(false);

  function submit() {
    const n = name.trim();
    const e = email.trim().toLowerCase();
    if (!n || !e) return;
    if (!emailDomainAllowed(e)) {
      setDenied(true);
      return;
    }
    const u = { name: n, email: e };
    storeAuthedUser(u);
    onAuthed(u);
  }

  return (
    <div className="mx-auto max-w-md animate-fade-up">
      {denied ? (
        <Card padding="md">
          <h2 className="text-h4 text-charcoal">This tool is for internal teams</h2>
          <p className="mt-2 text-body-sm leading-relaxed text-muted">
            Access is limited to approved work email domains (for example, example.com)
            addresses.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={() => setDenied(false)} variant="primary" size="md">
              Use a different email
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="md">
          <p className="mb-5 text-body-sm leading-relaxed text-muted">
            Tell us who you are to get started. We use this to attribute your brief, and
            we&apos;ll remember you on this device for 30 days.
          </p>
          <Field label="Your name" htmlFor="intake-name" className="mb-3">
            <Input
              id="intake-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </Field>
          <Field label="Work email" htmlFor="intake-email" className="mb-5">
            <Input
              id="intake-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="jane@example.com"
            />
          </Field>
          <Button
            onClick={submit}
            disabled={!name.trim() || !email.trim()}
            variant="primary"
            size="md"
            className="w-full"
          >
            Continue →
          </Button>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The conversational intake (rendered only after the gate).
// ---------------------------------------------------------------------------
function IntakeChat({ user }: { user: AuthedUser }) {
  const router = useRouter();
  const [intake, setIntake] = useState<IntakeRecord | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [info, setInfo] = useState<ConfigInfo | null>(null);
  const [answers, setAnswers] = useState<Record<string, { selected: string[]; custom: string }>>(
    {},
  );
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [ideating, setIdeating] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string; caption?: string } | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const questionSig = intake?.pendingQuestions.map((q) => q.id).join("|") ?? "";
  useEffect(() => {
    setStep(0);
  }, [questionSig]);

  useEffect(() => {
    (async () => {
      const [r, c] = await Promise.all([
        fetch("/api/intake", {
          method: "POST",
          body: JSON.stringify({ submitter: { name: user.name, email: user.email } }),
        }).then((x) => x.json()),
        fetch("/api/intake/config").then((x) => x.json()),
      ]);
      setIntake(r.intake);
      setInfo({
        requiredFields: c.config.requiredFields,
        secondaryFields: c.config.secondaryFields ?? [],
        env: c.env,
      });
    })();
  }, [user.name, user.email]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [intake?.messages.length, intake?.pendingQuestions.length]);

  async function generateBrief() {
    if (!intake || genBusy) return;
    setGenBusy(true);
    try {
      await fetch(`/api/intake/brief/${intake.id}`, { method: "POST" });
      router.push(`/intake/review/${intake.id}`);
    } finally {
      setGenBusy(false);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || !intake || busy || genBusy) return;
    setBusy(true);
    setAnswers({});
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

  const fields = intake?.fields;
  const hasValue = (k: string) => {
    const v = (fields as unknown as Record<string, unknown>)?.[k];
    return v != null && `${v}`.trim() !== "";
  };
  const required = info?.requiredFields ?? [];
  const secondary = info?.secondaryFields ?? [];
  const filled = required.filter(hasValue);
  const progress = required.length ? Math.round((filled.length / required.length) * 100) : 0;
  const coreReady = required.length > 0 && filled.length === required.length;
  const optionalFilled = secondary.filter(hasValue);
  const optionalProgress = secondary.length
    ? Math.round((optionalFilled.length / secondary.length) * 100)
    : 0;
  const phase = intake?.phase ?? "core";
  const noPending = (intake?.pendingQuestions.length ?? 0) === 0;
  // The user gets to choose what happens once the core is complete.
  const showChoice = !!intake && coreReady && noPending && !busy && !genBusy;

  // Move into the optional-detail phase and prompt the assistant for more.
  async function addMoreDetail() {
    if (!intake || busy || genBusy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        body: JSON.stringify({
          id: intake.id,
          phase: "detail",
          message: "I'd like to add more detail to make the brief richer.",
        }),
      });
      const data = await res.json();
      if (data.intake) setIntake(data.intake);
    } finally {
      setBusy(false);
    }
  }

  // Merge only attachment-owned fields so an in-flight conversation turn (and the
  // live message list) is never overwritten by an attachment/ideation response.
  function mergeAttachments(next: IntakeRecord) {
    setIntake((prev) =>
      prev
        ? {
            ...prev,
            attachments: next.attachments,
            fields: { ...prev.fields, variationIdeas: next.fields.variationIdeas },
          }
        : next,
    );
  }

  async function uploadFile(file: File) {
    if (!intake || uploading) return;
    setUploading(true);
    setAttachError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/intake/${intake.id}/attachments`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) setAttachError(data.error);
      else if (data.intake) mergeAttachments(data.intake);
    } catch (e) {
      setAttachError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(attId: string) {
    if (!intake) return;
    const res = await fetch(`/api/intake/${intake.id}/attachments/${attId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.intake) mergeAttachments(data.intake);
  }

  async function ideate() {
    if (!intake || ideating) return;
    setIdeating(true);
    setAttachError(null);
    try {
      const res = await fetch(`/api/intake/${intake.id}/ideate`, { method: "POST" });
      const data = await res.json();
      if (data.error) setAttachError(data.error);
      else if (data.intake) mergeAttachments(data.intake);
    } catch (e) {
      setAttachError((e as Error).message);
    } finally {
      setIdeating(false);
    }
  }

  const screenshots = intake?.attachments.filter((a) => a.kind === "screenshot") ?? [];
  const mockups = intake?.attachments.filter((a) => a.kind === "mockup") ?? [];
  const documents = intake?.attachments.filter((a) => a.kind === "document") ?? [];
  const hasUploads = screenshots.length + documents.length > 0;
  const canIdeate = screenshots.length > 0 && hasValue("businessContext") && hasValue("pageOrUrl");

  return (
    <div>
      <p className="mb-6 text-caption text-subtle">
        Submitting as {user.name} ({user.email}).
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card padding="none" className="flex h-[68vh] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-muted/30 px-5 py-4">
            <h2 className="text-h4 text-charcoal">Conversation</h2>
            {info && (
              <Badge
                variant={info.env.llmKind === "anthropic" ? "primary" : "neutral"}
                size="sm"
                title="LLM provider"
              >
                {info.env.llmKind === "anthropic" ? "Claude" : "Mock LLM"}
              </Badge>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
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
              !genBusy &&
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
                      <Eyebrow tone="light">Guided intake</Eyebrow>
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
                        <Button
                          onClick={submitAnswers}
                          disabled={!hasAnyAnswer}
                          variant="primary"
                          size="sm"
                        >
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
            {showChoice && (
              <div className="animate-fade-up rounded-lg border border-lime/50 bg-lime/[0.06] p-5">
                <Eyebrow tone="light">Core brief ready</Eyebrow>
                <p className="mt-2 text-body-sm leading-relaxed text-body">
                  {phase === "core"
                    ? "I have everything needed to file a solid ticket. You can finalize now, add optional detail (metrics, evidence, variations, dependencies), or share files for extra context."
                    : "You can keep adding detail, share files, or finalize whenever you're ready."}
                </p>
                {!hasUploads && (
                  <p className="mt-2 text-caption text-muted">
                    Have anything that would help — screenshots of the flow, mockups, or data
                    (PDF/CSV)? A screenshot also lets me suggest test variations and lo-fi mockups.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Button onClick={generateBrief} variant="primary" size="md">
                    Finalize brief &amp; review →
                  </Button>
                  {phase === "core" && (
                    <Button onClick={addMoreDetail} variant="secondary" size="md">
                      Add more detail
                    </Button>
                  )}
                  {!showUploader && !hasUploads && (
                    <Button
                      onClick={() => setShowUploader(true)}
                      variant="ghost"
                      size="md"
                    >
                      Add files
                    </Button>
                  )}
                </div>
              </div>
            )}
            {(showUploader || hasUploads) && intake && (
              <div className="animate-fade-up rounded-lg border border-muted/40 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Eyebrow tone="muted">Files &amp; context</Eyebrow>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="focus-ring rounded text-caption font-medium text-accent hover:underline disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "+ Add file"}
                  </button>
                </div>
                <p className="mb-3 text-caption text-subtle">
                  Screenshots, mockups, or data files (PDF, CSV, text). Screenshots enable AI
                  variation suggestions and lo-fi mockups.
                </p>

                {screenshots.length > 0 && (
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    {screenshots.map((a) => (
                      <div key={a.id} className="group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/intake/${intake.id}/attachments/${a.id}`}
                          alt={a.filename}
                          onClick={() =>
                            setLightbox({
                              src: `/api/intake/${intake.id}/attachments/${a.id}`,
                              alt: a.filename,
                            })
                          }
                          className="h-16 w-full cursor-zoom-in rounded border border-muted/40 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttachment(a.id)}
                          aria-label={`Remove ${a.filename}`}
                          className="focus-ring absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-charcoal text-[11px] text-on-dark opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {documents.length > 0 && (
                  <ul className="mb-3 space-y-1.5">
                    {documents.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-2 rounded border border-muted/40 bg-subtle px-2.5 py-1.5"
                      >
                        <span className="truncate text-caption text-body" title={a.filename}>
                          {a.filename}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(a.id)}
                          aria-label={`Remove ${a.filename}`}
                          className="focus-ring shrink-0 rounded text-caption text-subtle hover:text-critical-text"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {screenshots.length > 0 && (
                  <Button
                    onClick={ideate}
                    disabled={!canIdeate || ideating}
                    variant="primary"
                    size="sm"
                    title={canIdeate ? undefined : "Capture a problem statement and a page/URL first"}
                  >
                    {ideating
                      ? "Generating ideas…"
                      : mockups.length
                        ? "Regenerate variations"
                        : "Suggest variations"}
                  </Button>
                )}

                {mockups.length > 0 && (
                  <div className="mt-3">
                    <Eyebrow tone="muted" className="mb-2">
                      Suggested mockups
                    </Eyebrow>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {mockups.map((a) => (
                        <figure key={a.id}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/intake/${intake.id}/attachments/${a.id}`}
                            alt={a.caption ?? a.filename}
                            onClick={() =>
                              setLightbox({
                                src: `/api/intake/${intake.id}/attachments/${a.id}`,
                                alt: a.caption ?? a.filename,
                                caption: a.caption,
                              })
                            }
                            className="w-full cursor-zoom-in rounded border border-muted/40 bg-white object-contain"
                          />
                          {a.caption && (
                            <figcaption className="mt-1 text-caption text-subtle">
                              {a.caption}
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  </div>
                )}

                {attachError && <p className="mt-3 text-caption text-critical-text">{attachError}</p>}
              </div>
            )}
            {busy && (
              <div className="flex animate-fade-up justify-start" role="status" aria-live="polite">
                <div className="flex items-center gap-2 rounded-md bg-subtle px-4 py-2.5">
                  <span className="flex items-center gap-1" aria-hidden="true">
                    <span
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-charcoal/40"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-charcoal/40"
                      style={{ animationDelay: "160ms" }}
                    />
                    <span
                      className="typing-dot h-1.5 w-1.5 rounded-full bg-charcoal/40"
                      style={{ animationDelay: "320ms" }}
                    />
                  </span>
                  <span className="text-body-sm text-subtle">Thinking…</span>
                </div>
              </div>
            )}
            {genBusy && (
              <div className="flex animate-fade-up justify-start" role="status" aria-live="polite">
                <div className="flex items-center gap-2.5 rounded-md border border-lime/40 bg-lime/[0.06] px-4 py-3">
                  <span
                    className="spinner h-4 w-4 shrink-0 rounded-full border-2 border-lime/30 border-t-lime"
                    aria-hidden="true"
                  />
                  <span className="text-body-sm font-medium text-charcoal">
                    Finalizing your brief…
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-muted/30 p-3">
            {genBusy ? (
              <div
                className="flex animate-fade-in items-center justify-center gap-2.5 rounded-md bg-subtle px-4 py-3.5 text-body-sm text-muted"
                role="status"
                aria-live="polite"
              >
                <span
                  className="spinner h-4 w-4 shrink-0 rounded-full border-2 border-lime/30 border-t-lime"
                  aria-hidden="true"
                />
                <span className="font-medium">
                  Finalizing your brief. Input is locked so nothing gets missed.
                </span>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploader(true);
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                  aria-label="Attach a file"
                  title="Attach a screenshot, mockup, or data file"
                  className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-md border border-muted/60 text-muted transition hover:border-lime/60 hover:text-charcoal disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M21 11.5l-8.5 8.5a5 5 0 01-7-7l8.5-8.5a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3l8-8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
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
                  disabled={busy}
                  placeholder={
                    busy
                      ? "Thinking…"
                      : "e.g. We want to A/B test a simplified checkout to lift completions…"
                  }
                  className="flex-1 resize-none"
                />
                <Button
                  onClick={send}
                  disabled={busy || !input.trim()}
                  variant="primary"
                  size="md"
                >
                  Send
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,text/csv,text/plain,text/markdown,.csv,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </Card>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <Card padding="sm">
            {/* Core progress */}
            <div className="flex items-center justify-between">
              <h2 className="text-h4 text-charcoal">Core Details</h2>
              <span className="text-body-sm font-medium tabular-nums text-muted">
                {filled.length}/{required.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-subtle">
              <div
                className="h-1.5 rounded-full bg-lime transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer list-none text-caption text-subtle hover:text-muted">
                {coreReady ? "All core fields captured" : "Show fields"}
              </summary>
              <ul className="mt-2 space-y-1.5 text-body-sm">
                {required.map((k) => {
                  const done = filled.includes(k);
                  return (
                    <li key={k} className="flex items-center gap-2.5">
                      <span
                        className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold transition-colors ${
                          done ? "bg-lime text-charcoal" : "bg-muted/40 text-subtle"
                        }`}
                      >
                        {done ? "✓" : ""}
                      </span>
                      <span className={done ? "text-body" : "text-subtle"}>
                        {FIELD_LABELS[k] ?? k}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </details>

            {/* Optional progress (detail phase) */}
            {phase === "detail" && secondary.length > 0 && (
              <div className="mt-4 border-t border-muted/20 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-h4 text-charcoal">Optional Details</h2>
                  <span className="text-body-sm font-medium tabular-nums text-muted">
                    {optionalFilled.length}/{secondary.length}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-subtle">
                  <div
                    className="h-1.5 rounded-full bg-lime transition-all duration-500"
                    style={{ width: `${optionalProgress}%` }}
                  />
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer list-none text-caption text-subtle hover:text-muted">
                    Show fields
                  </summary>
                  <ul className="mt-2 space-y-1.5 text-body-sm">
                    {secondary.map((k) => {
                      const done = optionalFilled.includes(k);
                      return (
                        <li key={k} className="flex items-center gap-2.5">
                          <span
                            className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold transition-colors ${
                              done ? "bg-lime text-charcoal" : "bg-muted/40 text-subtle"
                            }`}
                          >
                            {done ? "✓" : ""}
                          </span>
                          <span className={done ? "text-body" : "text-subtle"}>
                            {FIELD_LABELS[k] ?? k}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
                <p className="mt-2 text-caption text-subtle">
                  All optional — finalize whenever you&apos;re ready.
                </p>
              </div>
            )}

            {/* Finalize CTA / guidance */}
            <div className="mt-4 border-t border-muted/20 pt-4">
              {coreReady ? (
                <Button
                  onClick={generateBrief}
                  disabled={genBusy}
                  variant="primary"
                  size="md"
                  className="w-full"
                >
                  {genBusy ? "Finalizing…" : "Finalize brief & review →"}
                </Button>
              ) : (
                <p className="text-caption text-subtle">
                  Answer the questions in the chat to capture the core details. You can finalize
                  or add optional detail once they&apos;re set.
                </p>
              )}
            </div>
          </Card>

          {intake && intake.unresolvedAssumptions.length > 0 && (
            <Callout variant="lime-tint" eyebrow="Open assumptions">
              <ul className="list-disc space-y-0.5 pl-4 text-body-sm text-body">
                {intake.unresolvedAssumptions.map((a, i) => (
                  <li key={i}>{humanizeAssumption(a)}</li>
                ))}
              </ul>
            </Callout>
          )}
        </aside>
      </div>

      <Lightbox
        src={lightbox?.src ?? null}
        alt={lightbox?.alt}
        caption={lightbox?.caption}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
