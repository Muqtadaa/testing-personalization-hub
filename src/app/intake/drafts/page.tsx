"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Eyebrow, PageHeader } from "@/components/ui";
import { type AuthedUser, readAuthedUser, storeAuthedUser } from "@/lib/intake/auth";
import { createClient } from "@/lib/supabase/client";
import { authConfigured } from "@/lib/supabase/env";
import { nameFromEmail } from "@/lib/auth/displayName";

interface DraftItem {
  id: string;
  title: string;
  updatedAt: string;
  phase: "core" | "detail";
  coreFilled: number;
  coreTotal: number;
  attachments: number;
}

export default function DraftsPage() {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [ready, setReady] = useState(false);
  const [drafts, setDrafts] = useState<DraftItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Prefer the signed-in hub session; fall back to the local identity.
      let u: AuthedUser | null = null;
      try {
        if (authConfigured()) {
          const supabase = createClient();
          const {
            data: { user: sUser },
          } = await supabase.auth.getUser();
          if (sUser?.email) {
            u = {
              name:
                (sUser.user_metadata?.name as string | undefined) ||
                (sUser.user_metadata?.full_name as string | undefined) ||
                nameFromEmail(sUser.email),
              email: sUser.email,
            };
            storeAuthedUser(u);
          }
        }
      } catch {
        // fall through to local identity
      }
      if (!u) u = readAuthedUser();
      setUser(u);
      setReady(true);
      if (!u) return;
      try {
        const res = await fetch(`/api/intake/drafts?email=${encodeURIComponent(u.email)}`);
        const data = await res.json();
        if (data.error) setError(data.error);
        else setDrafts(data.drafts);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  async function deleteDraft(id: string) {
    if (!user) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(
        `/api/intake/drafts?id=${encodeURIComponent(id)}&email=${encodeURIComponent(user.email)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.error) setError(data.error);
      else setDrafts((prev) => (prev ?? []).filter((x) => x.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
          ", " +
          d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  return (
    <>
      <PageHeader dark compact eyebrow="Testing & Personalization" title="Saved drafts" />
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {!ready ? null : !user ? (
            <Card padding="md" className="mx-auto max-w-md">
              <p className="text-body-sm text-muted">
                Tell us who you are on the intake page first, then your saved drafts will appear
                here.
              </p>
              <Link href="/intake" className="mt-4 inline-block">
                <Button as="span" variant="primary" size="md">
                  Go to intake →
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-body-sm text-subtle">
                  Drafts for {user.name} ({user.email})
                </p>
                <Link href="/intake">
                  <Button as="span" variant="secondary" size="sm">
                    + New intake
                  </Button>
                </Link>
              </div>

              {error && (
                <div className="rounded-md border border-critical-border bg-critical-tint p-4 text-body-sm text-critical-text">
                  {error}
                </div>
              )}

              {!drafts ? (
                <p className="text-body-sm text-muted">Loading drafts…</p>
              ) : drafts.length === 0 ? (
                <Card padding="md">
                  <h2 className="text-h4 text-charcoal">No saved drafts yet</h2>
                  <p className="mt-2 text-body-sm text-muted">
                    When you save a brief as a draft from the review page, it&apos;ll show up here so
                    you can come back and finish it before submitting.
                  </p>
                  <Link href="/intake" className="mt-4 inline-block">
                    <Button as="span" variant="primary" size="md">
                      Start an intake →
                    </Button>
                  </Link>
                </Card>
              ) : (
                <ul className="space-y-3">
                  {drafts.map((d) => {
                    const pct = d.coreTotal
                      ? Math.round((d.coreFilled / d.coreTotal) * 100)
                      : 0;
                    return (
                      <li key={d.id} className="flex items-stretch gap-2">
                        <Link
                          href={`/intake/review/${d.id}`}
                          className="focus-ring block min-w-0 flex-1 rounded-md"
                        >
                          <Card padding="sm" hoverable className="transition">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <h3 className="truncate text-body font-semibold text-charcoal">
                                  {d.title}
                                </h3>
                                <p className="mt-0.5 text-caption text-subtle">
                                  Updated {fmtDate(d.updatedAt)}
                                  {d.attachments > 0
                                    ? ` · ${d.attachments} attachment${d.attachments === 1 ? "" : "s"}`
                                    : ""}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <Eyebrow tone="muted">{d.coreFilled}/{d.coreTotal} core</Eyebrow>
                                <div className="mt-1 h-1.5 w-24 rounded-full bg-subtle">
                                  <div
                                    className="h-1.5 rounded-full bg-lime"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Link>
                        <div className="flex shrink-0 items-center">
                          {confirmId === d.id ? (
                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => deleteDraft(d.id)}
                                disabled={deletingId === d.id}
                                className="focus-ring rounded-md bg-critical px-3 py-1.5 text-caption font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                              >
                                {deletingId === d.id ? "Deleting…" : "Delete"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmId(null)}
                                disabled={deletingId === d.id}
                                className="focus-ring rounded-md px-3 py-1.5 text-caption font-medium text-muted transition hover:text-charcoal disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmId(d.id)}
                              aria-label={`Delete draft: ${d.title}`}
                              title="Delete draft"
                              className="focus-ring grid h-9 w-9 place-items-center rounded-md border border-muted/40 text-muted transition hover:border-critical-border hover:text-critical-text"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
