"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Callout, Card, Eyebrow, Field, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { authConfigured } from "@/lib/supabase/env";

// Only follow internal, single-slash paths after sign-in.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

// Hard navigation (not router.replace): a full page load makes the browser send
// the freshly-set Supabase auth cookie to the server, so the proxy/gate sees the
// session. A soft SPA navigation can race the cookie write and bounce back.
function go(path: string): void {
  window.location.assign(path);
}

export default function LoginPage() {
  const configured = authConfigured();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Seconds until another code may be requested. Supabase enforces a per-address
  // cooldown (~60s) and a per-hour cap; respecting it client-side avoids the
  // "email rate limit exceeded" error from repeated taps.
  const [cooldown, setCooldown] = useState(0);
  const next = useRef("/");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!configured) return;
    const params = new URLSearchParams(window.location.search);
    next.current = safeNext(params.get("next"));
    const supabase = createClient();
    (async () => {
      // Off-domain session bounced here by the gate: sign it out and explain.
      if (params.get("reason") === "domain") {
        await supabase.auth.signOut();
        setError("That email isn't on the access list. Sign in with your work email.");
        return;
      }
      // Already signed in (and allowed) — skip straight in.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) go(next.current);
    })();
  }, [configured]);

  async function sendCode() {
    if (busy || cooldown > 0 || !email.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setCode(""); // drop any stale/expired code so only the newest is entered
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 || data.rateLimited) {
          // Don't bounce to the code step — the previous code (if any) is still
          // valid. Let them wait out the cooldown and enter it.
          setError("Too many code requests. Please wait a minute, then try again — if you already got a code, you can enter it below.");
          setCooldown(60);
          if (step === "email") setStep("code");
        } else {
          setError(data.error ?? "Could not send a code. Try again.");
        }
        return;
      }
      setStep("code");
      setNotice(`We sent a code to ${email.trim().toLowerCase()}. If you requested more than one, use the most recent.`);
      setCooldown(60);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const token = code.trim();
    if (busy || token.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: verr } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token,
        type: "email",
      });
      if (verr) {
        const m = (verr.message || "").toLowerCase();
        if (/expire|invalid|not found|incorrect/.test(m)) {
          setError(
            'That code has expired or is incorrect. Tap "Send a new code" below, then enter the newest one.',
          );
          setCode("");
        } else if (/rate|too many/.test(m)) {
          setError("Too many attempts just now. Wait a moment, then try again.");
        } else {
          setError(verr.message || "That code didn't work. Check it and try again.");
        }
        return;
      }
      go(next.current);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-charcoal min-h-[calc(100vh-73px)] text-on-dark">
      <div className="mx-auto flex max-w-md flex-col justify-center px-6 py-16">
        <Eyebrow tone="dark" className="mb-3">
          Testing &amp; Personalization Hub
        </Eyebrow>
        <h1 className="text-h2 text-on-dark accent-underline">Sign in</h1>
        <p className="mt-3 text-body-sm text-on-dark-muted">
          Access is limited to approved work email domains. Enter yours and we&apos;ll send a
          one-time code.
        </p>

        <Card padding="md" className="mt-6">
          {!configured ? (
            <Callout variant="plain" eyebrow="Sign-in not configured">
              <p className="text-body-sm text-muted">
                Authentication isn&apos;t set up in this environment yet. Add the Supabase auth
                environment variables to enable sign-in.
              </p>
            </Callout>
          ) : step === "email" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendCode();
              }}
            >
              <Field label="Work email" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              {error && <p className="mt-3 text-caption text-critical-text">{error}</p>}
              <Button
                onClick={() => sendCode()}
                disabled={busy || !email.trim() || cooldown > 0}
                variant="primary"
                size="md"
                className="mt-4 w-full"
              >
                {busy ? "Sending…" : cooldown > 0 ? `Try again in ${cooldown}s` : "Email me a code"}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verify();
              }}
            >
              {notice && <p className="mb-3 text-caption text-muted">{notice}</p>}
              <Field label="Verification code" htmlFor="code" required>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={10}
                  placeholder="Enter the code from your email"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              {error && <p className="mt-3 text-caption text-critical-text">{error}</p>}
              <Button
                onClick={() => verify()}
                disabled={busy || code.trim().length < 6}
                variant="primary"
                size="md"
                className="mt-4 w-full"
              >
                {busy ? "Verifying…" : "Verify & sign in"}
              </Button>
              <div className="mt-3 flex items-center justify-between text-caption">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                    setNotice(null);
                  }}
                  className="text-muted underline-offset-2 hover:underline"
                >
                  ← Use a different email
                </button>
                <Button
                  onClick={() => sendCode()}
                  disabled={busy || cooldown > 0}
                  variant="ghost"
                  size="sm"
                >
                  {cooldown > 0 ? `New code in ${cooldown}s` : "Send a new code"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </section>
  );
}
