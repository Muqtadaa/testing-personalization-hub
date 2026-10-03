'use client';

// Surfaces a ticket-review flag on a roadmap item. Three presentations:
//   - variant="pill"  (default): a critical pill; with `actionable`, an
//     "Improve the brief →" link to the seeded improve flow.
//   - variant="dot": a tiny indicator dot (for tight Gantt row labels).
// Renders nothing when the item is unflagged or has no review yet.
import Link from 'next/link';

function label(review) {
  const rice = (review.riceMissing?.length ?? 0) > 0;
  const brief = !review.briefAdequate;
  if (rice && brief) return 'Needs review';
  if (rice) return 'Missing RICE';
  return 'Needs brief';
}

export default function ReviewBadge({ review, actionable = false, variant = 'pill', className = '' }) {
  if (!review || !review.flagged) return null;
  const title = review.summary ?? 'This ticket needs attention before it can be prioritized.';

  if (variant === 'dot') {
    return (
      <Link
        href={`/intake/improve/${review.key}`}
        title={`${title} — click to improve`}
        aria-label={`${label(review)}: ${title}. Improve the brief.`}
        className={`inline-flex flex-shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded-full ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-critical-text" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        title={title}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-eyebrow whitespace-nowrap bg-critical-tint text-critical-text"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2 1 21h22L12 2zm0 6 7 12H5l7-12zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
        </svg>
        {label(review)}
      </span>
      {actionable && (
        <Link
          href={`/intake/improve/${review.key}`}
          className="text-caption font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime rounded whitespace-nowrap"
        >
          Improve the brief →
        </Link>
      )}
    </span>
  );
}
