"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, PageHeader, Textarea } from "@/components/ui";
import type { ParseStats, ParseWarning, ResultsVersionMeta } from "@/lib/results/types";
import { formatMonthKey } from "@/lib/results/format";
import { useResults } from "./ResultsDataProvider";

// Data management: upload the Revenue Workbook (+ optional Source Data),
// review the parse report, and manage the version history (activate = rollback).

interface UploadResult {
  version: ResultsVersionMeta;
  stats: ParseStats;
  warnings: ParseWarning[];
}

export default function DataManager() {
  const { refetch } = useResults();
  const [versions, setVersions] = useState<ResultsVersionMeta[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch("/api/results/versions");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load versions.");
      setVersions(body.versions);
      setListError(null);
    } catch (err) {
      setListError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const onDataChanged = useCallback(() => {
    loadVersions();
    refetch();
  }, [loadVersions, refetch]);

  return (
    <>
      <PageHeader
        dark
        eyebrow="Results · data"
        title="Source data"
        intro="Upload the monthly Revenue Workbook to refresh what the whole team sees. Every upload is kept as a version you can roll back to."
      />
      <div className="mx-auto max-w-7xl space-y-10 px-6 py-10">
        <UploadPanel onUploaded={onDataChanged} />
        <VersionHistory versions={versions} error={listError} onChanged={onDataChanged} />
      </div>
    </>
  );
}

// ── Upload ──

function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const [workbook, setWorkbook] = useState<File | null>(null);
  const [sourceData, setSourceData] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const submit = async () => {
    if (!workbook || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set("workbook", workbook);
      if (sourceData) form.set("sourceData", sourceData);
      if (notes.trim()) form.set("notes", notes.trim());
      const res = await fetch("/api/results/upload", { method: "POST", body: form });
      const isJson = res.headers.get("content-type")?.includes("json");
      if (!isJson) throw new Error("Your session has expired. Refresh the page to sign in again.");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Upload failed (${res.status}).`);
      setResult(body);
      setWorkbook(null);
      setSourceData(null);
      setNotes("");
      onUploaded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Upload data">
      <div className="grid gap-6 lg:grid-cols-2">
        <FileSlot
          label="Revenue Workbook"
          required
          hint='Monthly sheets ("26 Jan"), Summary, and forecast tabs.'
          file={workbook}
          onFile={setWorkbook}
        />
        <FileSlot
          label="Source Data"
          hint="Optional. Adds experiment names, campaigns, dates, and variation labels."
          file={sourceData}
          onFile={setSourceData}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="min-w-64 flex-1">
          <span className="mb-1 block text-caption text-muted">Notes for this upload (optional)</span>
          <Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. May close added" />
        </label>
        <Button onClick={submit} disabled={!workbook || busy}>
          {busy ? "Parsing…" : "Upload & activate"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-critical-border bg-critical-tint px-4 py-3 text-body-sm text-critical-text">
          {error}
        </p>
      )}
      {result && <ParseReport result={result} />}
    </section>
  );
}

function FileSlot({
  label,
  hint,
  required = false,
  file,
  onFile,
}: {
  label: string;
  hint: string;
  required?: boolean;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) onFile(dropped);
      }}
      className={`rounded-lg border-2 border-dashed p-5 transition ${
        dragOver ? "border-lime bg-lime/5" : file ? "border-muted/40 bg-white" : "border-muted/40 bg-subtle/50"
      }`}
    >
      <p className="text-body-sm font-semibold text-body">
        {label}
        {required && <span className="ml-1 text-critical-text" title="Required">*</span>}
      </p>
      <p className="mt-0.5 text-caption text-muted">{hint}</p>
      {file ? (
        <p className="mt-3 flex items-center justify-between gap-3 rounded-md bg-subtle px-3 py-2 text-body-sm">
          <span className="truncate font-mono text-caption">{file.name}</span>
          <button
            type="button"
            onClick={() => onFile(null)}
            className="shrink-0 rounded text-caption font-semibold text-muted hover:text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            Remove
          </button>
        </p>
      ) : (
        <div className="mt-3">
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            Choose .xlsx file
          </Button>
          <span className="ml-3 text-caption text-subtle">or drag it here</span>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function ParseReport({ result }: { result: UploadResult }) {
  const { stats, warnings } = result;
  const monthRange = stats.monthsFound.length
    ? `${formatMonthKey(stats.monthsFound[0])} – ${formatMonthKey(stats.monthsFound[stats.monthsFound.length - 1])}`
    : "none";
  return (
    <Card padding="md" className="mt-5">
      <h3 className="text-h4 text-charcoal">Upload parsed and activated</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-body-sm sm:grid-cols-4">
        <ReportStat label="Months" value={`${stats.monthsFound.length} (${monthRange})`} />
        <ReportStat label="Experiment-months" value={stats.experimentCount.toLocaleString("en-US")} />
        <ReportStat label="Variations" value={stats.variationCount.toLocaleString("en-US")} />
        <ReportStat
          label="Forecast years"
          value={stats.forecastYears.length ? stats.forecastYears.join(", ") : "none"}
        />
      </dl>
      {warnings.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-body-sm font-semibold text-body">
            {warnings.length} parse warning{warnings.length === 1 ? "" : "s"} — data still loaded
          </summary>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-caption text-muted">
            {warnings.map((w, i) => (
              <li key={i}>
                {w.sheet && <span className="font-mono">[{w.sheet}]</span>} {w.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption uppercase tracking-eyebrow text-subtle">{label}</dt>
      <dd className="mt-0.5 font-mono text-body-sm text-body">{value}</dd>
    </div>
  );
}

// ── Version history ──

function VersionHistory({
  versions,
  error,
  onChanged,
}: {
  versions: ResultsVersionMeta[] | null;
  error: string | null;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = async (id: string, action: "activate" | "delete") => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch(
        action === "activate" ? `/api/results/versions/${id}/activate` : `/api/results/versions/${id}`,
        { method: action === "activate" ? "POST" : "DELETE" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `${action} failed (${res.status}).`);
      onChanged();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <section aria-label="Version history">
      <h2 className="text-h4 text-charcoal">Version history</h2>
      <p className="mt-0.5 text-body-sm text-muted">
        The active version is what every Results page reads. Activate an older version to roll back.
      </p>
      {error && <p className="mt-3 text-body-sm text-critical-text">{error}</p>}
      {actionError && (
        <p role="alert" className="mt-3 rounded-md border border-critical-border bg-critical-tint px-4 py-2 text-body-sm text-critical-text">
          {actionError}
        </p>
      )}
      {!versions ? (
        <div className="mt-4 h-24 animate-pulse rounded-lg bg-subtle" aria-hidden />
      ) : versions.length === 0 ? (
        <p className="mt-4 rounded-lg border border-muted/30 bg-white p-6 text-body-sm text-muted shadow-card">
          No uploads yet. The first workbook you upload becomes the active dataset.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-muted/30 bg-white shadow-card">
          <table className="w-full min-w-[680px] text-body-sm">
            <thead>
              <tr className="border-b border-muted/30 bg-subtle text-left text-caption uppercase tracking-eyebrow text-subtle">
                <th scope="col" className="px-4 py-2.5 font-semibold">Uploaded</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">By</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Files</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Coverage</th>
                <th scope="col" className="px-4 py-2.5 font-semibold" aria-label="Status" />
                <th scope="col" className="px-4 py-2.5 font-semibold" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/20">
              {versions.map((v) => {
                const when = new Date(v.createdAt);
                const months = v.parseStats.monthsFound ?? [];
                return (
                  <tr key={v.id} className={v.isActive ? "bg-lime/5" : undefined}>
                    <td className="px-4 py-3 text-body">
                      {when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      <span className="block text-caption text-muted">
                        {when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{v.uploadedByName ?? v.uploadedByEmail ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="block max-w-56 truncate font-mono text-caption text-body" title={v.workbookFilename}>
                        {v.workbookFilename}
                      </span>
                      {v.sourceFilename && (
                        <span className="block max-w-56 truncate font-mono text-caption text-muted" title={v.sourceFilename}>
                          + {v.sourceFilename}
                        </span>
                      )}
                      {v.notes && <span className="block text-caption italic text-muted">{v.notes}</span>}
                    </td>
                    <td className="px-4 py-3 text-caption text-muted">
                      {months.length
                        ? `${formatMonthKey(months[0])} – ${formatMonthKey(months[months.length - 1])}`
                        : "—"}
                      <span className="block">
                        {v.parseStats.experimentCount?.toLocaleString("en-US")} experiment-months
                        {v.parseStats.warningCount ? ` · ${v.parseStats.warningCount} warnings` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {v.isActive && (
                        <span className="rounded bg-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-eyebrow text-charcoal">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!v.isActive && (
                        <span className="inline-flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId !== null}
                            onClick={() => act(v.id, "activate")}
                          >
                            {busyId === v.id ? "…" : "Activate"}
                          </Button>
                          {confirmId === v.id ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="!border-critical-border !text-critical-text hover:!bg-critical-tint"
                              disabled={busyId !== null}
                              onClick={() => act(v.id, "delete")}
                            >
                              Confirm delete
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId !== null}
                              onClick={() => setConfirmId(v.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
