'use client';

// Two-tier hub navigation.
//   Row 1 (always): brand + primary tool switcher — Home, Explore (FX), Backlog,
//     Intake — plus a "soon" marker for Results.
//   Row 2 (inside a tool section): the tool's own sub-nav — the FX Explorer's
//     pages, or the Intake tool's (New intake / Admin) — so each tool keeps its
//     full navigation as one section within the hub.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import AuthMenu from './AuthMenu.jsx';

// Primary tool-level navigation.
const tools = [
  { href: '/', label: 'Home', end: true },
  { href: '/explore', label: 'Explore FX' },
  { href: '/backlog', label: 'Roadmap' },
  { href: '/intake', label: 'Intake' },
  { href: '/results', label: 'Results' },
];

// Tools that exist but aren't wired into the hub yet (Phase 3+).
const soonTools = [];

// The Intake tool's own pages (shown as a sub-nav inside /intake).
const intakeLinks = [
  { href: '/intake', label: 'New intake', end: true },
  { href: '/intake/drafts', label: 'Drafts' },
  { href: '/intake/admin/config', label: 'Admin' },
];

// The Results tool's own pages (shown as a sub-nav inside /results).
const resultsLinks = [
  { href: '/results', label: 'Overview', end: true },
  { href: '/results/explorer', label: 'Explorer' },
  { href: '/results/data', label: 'Data' },
];

// The Feature Experimentation explorer's own pages.
const fxLinks = [
  { href: '/explore', label: 'Overview', end: true },
  { href: '/decide', label: 'Decide' },
  { href: '/pre-analysis', label: 'Pre-Analysis' },
  { href: '/process', label: 'Process' },
  { href: '/roles', label: 'Roles' },
  { href: '/use-cases', label: 'Use Cases' },
  { href: '/concepts', label: 'Concepts' },
  { href: '/templates', label: 'Templates' },
];

// Paths that belong to the FX tool — used to surface row 2 and to keep the
// "Explore" tool tab active while browsing any FX page.
const FX_PATHS = fxLinks.map((l) => l.href);
const INTAKE_PATHS = intakeLinks.map((l) => l.href);

const NAV_LINK_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal';

function isActive(pathname, href, end) {
  if (end) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export default function HubNav() {
  const pathname = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);

  // Publish the sticky header's real height to a CSS var so `scroll-padding-top`
  // (globals.css) can offset route-change and anchor scrolls accurately. The
  // height changes when Row 2 appears/disappears or the mobile menu toggles,
  // so we re-measure on pathname/menu changes and on resize.
  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;
    const setHeight = () =>
      document.documentElement.style.setProperty(
        '--hub-nav-h',
        `${navEl.offsetHeight}px`,
      );
    setHeight();
    const observer = new ResizeObserver(setHeight);
    observer.observe(navEl);
    return () => observer.disconnect();
  }, [pathname, open]);

  const inFxArea = FX_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  const inIntakeArea =
    pathname === '/intake' || pathname.startsWith('/intake/');
  const inResultsArea =
    pathname === '/results' || pathname.startsWith('/results/');

  // The Explore/Intake/Results tool tabs stay active across their whole section.
  const toolActive = (t) =>
    t.href === '/explore'
      ? inFxArea
      : t.href === '/intake'
        ? inIntakeArea
        : t.href === '/results'
          ? inResultsArea
          : isActive(pathname, t.href, t.end);

  // Row-2 sub-nav reflects whichever tool section we're in.
  const section = inFxArea
    ? { label: 'FX Explorer', links: fxLinks }
    : inIntakeArea
      ? { label: 'Intake', links: intakeLinks }
      : inResultsArea
        ? { label: 'Results', links: resultsLinks }
        : null;

  return (
    <nav
      ref={navRef}
      className="bg-charcoal text-on-dark sticky top-0 z-nav border-b border-charcoal-alt"
    >
      {/* Row 1 — brand + tool switcher */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className={`flex items-center gap-3 group rounded ${NAV_LINK_FOCUS}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Testing & Personalization Hub"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <div className="flex flex-col leading-none">
            <span className="text-body-sm font-bold tracking-wide">HUB</span>
            <span className="text-caption text-on-dark-muted mt-0.5">
              Testing &amp; Personalization
            </span>
          </div>
        </Link>

        <button
          className={`md:hidden text-on-dark rounded ${NAV_LINK_FOCUS}`}
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d={open ? 'M6 6L18 18M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {tools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-2 text-body-sm font-medium rounded-md transition ${NAV_LINK_FOCUS} ${
                toolActive(t)
                  ? 'bg-lime text-charcoal'
                  : 'text-on-dark/85 hover:text-lime hover:bg-charcoal-alt'
              }`}
            >
              {t.label}
            </Link>
          ))}
          {soonTools.map((t) => (
            <span
              key={t.label}
              className="px-4 py-2 text-body-sm font-medium rounded-md text-on-dark/55 inline-flex items-center gap-2 cursor-default select-none"
              title="Coming soon"
            >
              {t.label}
              <span className="text-[10px] font-bold uppercase tracking-eyebrow text-accent-on-dark/70 border border-lime/25 rounded px-1 py-px">
                Soon
              </span>
            </span>
          ))}
          <AuthMenu />
        </div>
      </div>

      {/* Row 2 — sub-nav for whichever tool section we're in (desktop) */}
      {section && (
        <div className="hidden md:block border-t border-charcoal-alt bg-charcoal-deeper">
          <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
            <span className="text-caption uppercase tracking-eyebrow text-on-dark-subtle pr-3 py-2.5 shrink-0">
              {section.label}
            </span>
            {section.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2.5 text-body-sm rounded-md transition whitespace-nowrap ${NAV_LINK_FOCUS} ${
                  isActive(pathname, l.href, l.end)
                    ? 'text-lime font-semibold'
                    : 'text-on-dark/75 hover:text-lime'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile menu — tools + (if in FX) sub-links */}
      {open && (
        <div
          id="mobile-nav"
          className="md:hidden border-t border-charcoal-alt px-4 py-3 flex flex-col gap-1"
        >
          {tools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              onClick={() => setOpen(false)}
              className={`px-3 py-2 text-body-sm rounded-md ${NAV_LINK_FOCUS} ${
                toolActive(t)
                  ? 'bg-lime text-charcoal'
                  : 'text-on-dark/85 hover:bg-charcoal-alt'
              }`}
            >
              {t.label}
            </Link>
          ))}
          {soonTools.map((t) => (
            <span
              key={t.label}
              className="px-3 py-2 text-body-sm rounded-md text-on-dark/55 inline-flex items-center gap-2"
            >
              {t.label}
              <span className="text-[10px] font-bold uppercase tracking-eyebrow text-accent-on-dark/70 border border-lime/25 rounded px-1 py-px">
                Soon
              </span>
            </span>
          ))}

          {section && (
            <>
              <div className="mt-2 pt-2 border-t border-charcoal-alt text-caption uppercase tracking-eyebrow text-on-dark-subtle px-3 pb-1">
                {section.label}
              </div>
              {section.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2 text-body-sm rounded-md ${NAV_LINK_FOCUS} ${
                    isActive(pathname, l.href, l.end)
                      ? 'bg-charcoal-alt text-lime'
                      : 'text-on-dark/75 hover:bg-charcoal-alt'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </>
          )}

          <AuthMenu variant="mobile" />
        </div>
      )}
    </nav>
  );
}
