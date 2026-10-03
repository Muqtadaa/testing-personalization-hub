"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ResultsDataset, ResultsVersionMeta } from "@/lib/results/types";

// Fetches the active dataset once per page session and shares it across every
// Results surface. The payload is the full normalized dataset (~1–3MB), so we
// never refetch on navigation within the section.

interface ResultsData {
  meta: ResultsVersionMeta | null;
  dataset: ResultsDataset | null;
  loading: boolean;
  /** "session-expired" gets a special re-login message. */
  error: string | null;
  refetch: () => void;
}

const ResultsContext = createContext<ResultsData | null>(null);

export function useResults(): ResultsData {
  const ctx = useContext(ResultsContext);
  if (!ctx) throw new Error("useResults must be used inside <ResultsDataProvider>");
  return ctx;
}

export default function ResultsDataProvider({ children }: { children: ReactNode }) {
  const [meta, setMeta] = useState<ResultsVersionMeta | null>(null);
  const [dataset, setDataset] = useState<ResultsDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/results/data");
        // The auth proxy answers expired sessions with a redirect to /login
        // (HTML), not a 401 — detect non-JSON and say so plainly.
        const isJson = res.headers.get("content-type")?.includes("json");
        if (res.redirected || !isJson) {
          if (!cancelled) setError("Your session has expired. Refresh the page to sign in again.");
          return;
        }
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
        if (!cancelled) {
          setMeta(body.meta ?? null);
          setDataset(body.dataset ?? null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const value = useMemo(
    () => ({ meta, dataset, loading, error, refetch }),
    [meta, dataset, loading, error, refetch],
  );

  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>;
}
