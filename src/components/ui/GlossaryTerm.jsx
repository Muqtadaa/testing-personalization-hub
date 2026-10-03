// Inline glossary term — wrap a term in JSX-authored copy to attach a tooltip
// showing its one-line definition + a deep link to /concepts#<id>.
//
// Interaction model:
//   - Hover on a pointer device: show after a small delay
//   - Focus via keyboard: show immediately
//   - Tap on touch: tap toggles open; tap outside or Escape closes
//   - prefers-reduced-motion: skip the fade transition
//
// Accessibility:
//   - the trigger is a <button type="button"> with aria-describedby pointing
//     to the popover when open, so screen readers announce the definition
//   - the popover itself is role="tooltip" and aria-live polite
//
// Implementation notes:
//   - no external dep; positioning is plain absolute relative to the trigger
//   - viewport-overflow protection on the right edge via max-w + clamp to right-0
//     when the trigger sits in the rightmost ~50% of its container

'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { concepts } from '../../data/concepts.js';

const conceptsById = concepts.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

export default function GlossaryTerm({
  term,
  children,
  className = '',
}) {
  const concept = conceptsById[term];
  // If the term key isn't in the glossary, fall through to plain text — never break the page.
  if (!concept) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`<GlossaryTerm term="${term}"> — no matching concept found.`);
    }
    return <>{children}</>;
  }

  return <GlossaryTermPopover concept={concept} className={className}>{children}</GlossaryTermPopover>;
}

function GlossaryTermPopover({ concept, className, children }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState('bottom');
  const hoverTimer = useRef(null);
  const rootRef = useRef(null);
  const popoverId = useId();

  // When opening, measure the trigger against the viewport. If a 200-ish-px
  // popover wouldn't fit below, flip to top placement.
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setPlacement(spaceBelow < 220 && rect.top > 220 ? 'top' : 'bottom');
  }, [open]);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return undefined;
    function onClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Clean up any pending hover-open timer when unmounting.
  useEffect(
    () => () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  function scheduleOpen() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setOpen(true), 120);
  }
  function cancelOpen() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(false);
  }

  return (
    <span
      ref={rootRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={scheduleOpen}
      onMouseLeave={cancelOpen}
    >
      <button
        type="button"
        aria-describedby={open ? popoverId : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="relative inline cursor-help border-b border-dotted border-current/60 hover:border-current bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 rounded-sm before:absolute before:content-[''] before:-inset-x-1 before:-inset-y-2 before:z-0"
      >
        {children}
      </button>
      {open && (
        <span
          id={popoverId}
          role="tooltip"
          className={`absolute left-0 z-dropdown w-72 max-w-[min(18rem,calc(100vw-2rem))] bg-charcoal text-on-dark text-body-sm rounded-lg shadow-cardHover p-4 motion-safe:animate-tooltip-in ${
            placement === 'top'
              ? 'bottom-full mb-2'
              : 'top-full mt-2'
          }`}
        >
          <span className="block text-eyebrow uppercase tracking-eyebrow text-accent-on-dark mb-1">
            {concept.term}
          </span>
          <span className="block leading-relaxed">{concept.oneLineDef}</span>
          <Link
            href={`/concepts#${concept.id}`}
            onClick={() => setOpen(false)}
            className="mt-3 inline-flex items-center gap-1 text-caption text-accent-on-dark hover:text-white underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal rounded-sm"
          >
            Full entry →
          </Link>
        </span>
      )}
    </span>
  );
}
