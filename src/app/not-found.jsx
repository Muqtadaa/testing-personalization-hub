import Link from 'next/link';
import { Button, Eyebrow } from '@/components/ui';

const suggestions = [
  {
    eyebrow: 'Start here',
    title: 'Run the qualification quiz',
    blurb: 'Decide whether your enhancement is an FX candidate in seven questions.',
    to: '/decide',
  },
  {
    eyebrow: 'Process',
    title: 'Walk the 8-phase workflow',
    blurb: 'See the goal, owners, activities, and expected output for each phase.',
    to: '/process',
  },
  {
    eyebrow: 'Roles',
    title: 'Find your part',
    blurb: 'Product, Engineering, T&P, Analytics, or Leadership — where you fit.',
    to: '/roles',
  },
  {
    eyebrow: 'Backlog',
    title: 'Browse the test backlog',
    blurb: 'RICE-scored backlog items across the Online Store, Marketplace, and Rewards App, filterable by status and priority.',
    to: '/backlog',
  },
];

export default function NotFound() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20 md:py-24">
      <Eyebrow tone="light">Error 404</Eyebrow>
      <h1 className="text-h1 md:text-h1-lg text-charcoal mt-3 max-w-3xl">
        Couldn&apos;t qualify that URL.
      </h1>
      <p className="mt-5 text-body-lg text-muted max-w-2xl">
        No tool, phase, role, or backlog item matches this path. The link may
        be stale or the URL might be wrong. Here&apos;s where most people are
        headed:
      </p>

      <ul className="mt-10 grid md:grid-cols-2 gap-4">
        {suggestions.map((s) => (
          <li key={s.to}>
            <Link
              href={s.to}
              className="group block bg-white border border-muted/30 rounded-lg p-5 hover:border-lime/50 hover:shadow-card transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
            >
              <Eyebrow tone="light" className="mb-1">
                {s.eyebrow}
              </Eyebrow>
              <div className="text-h4 text-charcoal flex items-center gap-2">
                {s.title}
                <span
                  aria-hidden="true"
                  className="text-accent transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
              <p className="text-body-sm text-muted mt-2">{s.blurb}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex items-center gap-4">
        <Button as={Link} href="/" variant="secondary" size="md">
          Back to home
        </Button>
        <span className="text-caption text-subtle italic">
          (Decision criteria: this page does not exist.)
        </span>
      </div>
    </div>
  );
}
