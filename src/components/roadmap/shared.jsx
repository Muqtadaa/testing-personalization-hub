// Shared presentational helpers for the roadmap views. Stage-colored elements
// use inline styles (Tailwind can't generate classes from runtime values).

import { STAGE_META } from '@/lib/roadmap/stages';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Jun 3" or "Jun 3, 2026" when the year differs from now. */
export function formatDate(iso, { withYear } = {}) {
  const d = parseDate(iso);
  if (!d) return '—';
  const now = new Date();
  const showYear = withYear ?? d.getFullYear() !== now.getFullYear();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${showYear ? `, ${d.getFullYear()}` : ''}`;
}

/** "today", "3d ago", "2w ago" — coarse relative time. */
export function formatRelative(iso) {
  const d = parseDate(iso);
  if (!d) return '—';
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export function formatTime(iso) {
  const d = parseDate(iso);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function StageDot({ stage, size = 8 }) {
  const m = STAGE_META[stage] ?? STAGE_META.Backlog;
  return (
    <span
      aria-hidden="true"
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: m.color }}
    />
  );
}

export function StageChip({ stage, className = '' }) {
  const m = STAGE_META[stage] ?? STAGE_META.Backlog;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-caption font-semibold leading-none whitespace-nowrap ${className}`}
      style={{ backgroundColor: `${m.color}1A`, color: m.text }}
    >
      <StageDot stage={stage} size={6} />
      {m.label}
    </span>
  );
}

/** Neutral meta chip (LOB / Journey / Request type / test type). */
export function MetaChip({ children, title }) {
  if (!children) return null;
  return (
    <span
      title={title}
      className="inline-flex items-center rounded bg-subtle border border-muted/40 text-[10px] font-semibold text-muted px-1.5 py-0.5 whitespace-nowrap"
    >
      {children}
    </span>
  );
}

export function RiskBadge({ atRisk }) {
  if (!atRisk) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-caption font-bold uppercase tracking-eyebrow whitespace-nowrap bg-critical-tint text-critical-text">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2 1 21h22L12 2zm0 6 7 12H5l7-12zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
      </svg>
      At risk
    </span>
  );
}

export function Avatar({ assignee, size = 22 }) {
  if (assignee?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={assignee.avatarUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="rounded-full flex-shrink-0 ring-1 ring-muted/30"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = (assignee?.name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full bg-charcoal text-on-dark font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}

export function PriorityFlag({ priority }) {
  if (!priority || priority === 'Medium') return null;
  const high = priority === 'High' || priority === 'Highest';
  return (
    <span
      className={`inline-flex items-center text-caption font-bold uppercase tracking-eyebrow ${high ? 'text-critical-text' : 'text-subtle'}`}
      title={`Priority: ${priority}`}
    >
      {priority}
    </span>
  );
}
