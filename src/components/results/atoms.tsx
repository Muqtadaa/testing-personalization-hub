"use client";

import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import type { ExperimentType } from "@/lib/results/types";
import { formatCurrency } from "@/lib/results/format";

// Small shared display atoms for the Results section.

/** Signed currency with semantic color: accent green for gains, critical for losses. */
export function UpliftValue({
  value,
  className = "",
  exact = false,
}: {
  value: number | null | undefined;
  className?: string;
  exact?: boolean;
}) {
  if (value == null || !isFinite(value)) {
    return <span className={`text-subtle ${className}`}>—</span>;
  }
  const tone = value > 0 ? "text-accent" : value < 0 ? "text-critical-text" : "text-body";
  const formatted = formatCurrency(value);
  return (
    <span className={`font-mono tabular-nums ${tone} ${className}`}>
      {value > 0 ? "+" : ""}
      {exact ? formatted : formatted}
    </span>
  );
}

const TYPE_LABEL: Record<ExperimentType, string> = {
  optimization: "Optimization",
  personalization: "Personalization",
  other: "Other",
};

export function TypeBadge({ type, tag }: { type: ExperimentType; tag?: string | null }) {
  const variant = type === "optimization" ? "outline" : type === "personalization" ? "primary" : "neutral";
  return (
    <Badge variant={variant} size="sm" title={tag ? `Workbook tag: [${tag}]` : undefined}>
      {TYPE_LABEL[type]}
    </Badge>
  );
}

/** Loading skeleton for chart/table regions. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-subtle ${className}`}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-10" aria-busy="true" aria-label="Loading results data">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="col-span-2 h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/** Teaching empty state shown when no dataset has been uploaded yet. */
export function NoDataState() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <Card padding="lg" className="mx-auto max-w-xl text-center">
        <h2 className="text-h3 text-charcoal">No revenue data yet</h2>
        <p className="mt-2 text-body text-muted">
          Results reads from the monthly Revenue Workbook. Upload it once and every
          page here — overview, explorer, and experiment detail — fills in for the
          whole team.
        </p>
        <div className="mt-6">
          <Button as={Link} href="/results/data">
            Upload the workbook
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <div className="mx-auto max-w-xl rounded-lg border border-critical-border bg-critical-tint p-6 text-center">
        <h2 className="text-h4 text-critical-text">Couldn&rsquo;t load results data</h2>
        <p className="mt-1 text-body-sm text-critical-text">{message}</p>
        {onRetry && (
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
