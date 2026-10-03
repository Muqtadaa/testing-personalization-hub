import Link from 'next/link';
import { Eyebrow } from './ui';

export default function Footer() {
  return (
    <footer className="bg-charcoal text-on-dark border-t border-charcoal-alt mt-auto no-print">
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-xl">
          <Eyebrow tone="dark" className="mb-2">
            Testing &amp; Personalization Hub
          </Eyebrow>
          <p className="text-body-sm text-on-dark-muted">
            Tools for the team to test, prioritize, and learn — from intake to evidence.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <FooterLink href="/explore">Explore</FooterLink>
          <FooterLink href="/decide">Decide</FooterLink>
          <FooterLink href="/process">Process</FooterLink>
          <FooterLink href="/roles">Roles</FooterLink>
          <FooterLink href="/use-cases">Use cases</FooterLink>
          <FooterLink href="/concepts">Concepts</FooterLink>
          <FooterLink href="/templates">Templates</FooterLink>
          <FooterLink href="/backlog">Backlog</FooterLink>
        </nav>
      </div>
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="border-t border-charcoal-alt pt-5 flex items-center justify-between gap-4 text-caption text-on-dark-subtle">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-accent-on-dark">✶</span>
            <span>Testing &amp; Personalization Hub</span>
          </div>
          <div className="italic">Ship with evidence.</div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }) {
  return (
    <Link
      href={href}
      className="text-body-sm text-on-dark-muted hover:text-lime transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal rounded"
    >
      {children}
    </Link>
  );
}
