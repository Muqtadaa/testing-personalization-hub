import Link from 'next/link';
import {
  Button,
  Card,
  Callout,
  Eyebrow,
  GlossaryTerm,
  SectionHeader,
} from '@/components/ui';

const reasons = [
  {
    title: 'Validate business impact before scaling',
    body: 'A feature can be well designed and technically functional but still fail to move the metrics it was built for. FX answers: does this actually improve conversion rate, repeat purchase behavior, order value, or support team throughput?',
  },
  {
    title: 'Reduce rollout risk',
    body: (
      <>
        FX separates deployment from release. Ship the code, gate the
        experience behind a{' '}
        <GlossaryTerm term="feature-flag">feature flag</GlossaryTerm>, expose
        it gradually, and roll back without another deploy if{' '}
        <GlossaryTerm term="guardrail-metric">guardrails</GlossaryTerm> move.
      </>
    ),
  },
  {
    title: 'Decide with evidence, not preference',
    body: (
      <>
        When stakeholders disagree, FX gives a neutral arbiter — pre-agreed
        hypothesis, KPI,{' '}
        <GlossaryTerm term="guardrail-metric">guardrails</GlossaryTerm>, and
        decision criteria.
      </>
    ),
  },
  {
    title: 'Learn before investing further',
    body: 'Many features are the first step of a larger capability. FX tells us whether the initial version earns the next investment.',
  },
  {
    title: 'Support audience-specific rollouts',
    body: (
      <>
        Some enhancements work for new visitors but not returning customers,
        or for one risk tier but not another. FX surfaces those distinctions
        via <GlossaryTerm term="audience">audiences</GlossaryTerm> and
        segment-level reporting.
      </>
    ),
  },
];

const audiences = [
  {
    role: 'Product',
    blurb:
      'See the qualification questions, decision criteria, and what each phase needs from you.',
    to: '/roles/product',
  },
  {
    role: 'Engineering',
    blurb:
      'Flag patterns, instrumentation expectations, fallback behavior, and cleanup ownership.',
    to: '/roles/engineering',
  },
  {
    role: 'Testing & Personalization',
    blurb:
      'End-to-end ownership view — qualification through readout, with the templates needed at each phase.',
    to: '/roles/testing-personalization',
  },
  {
    role: 'Analytics',
    blurb:
      'When Optimizely reporting is enough vs. when warehouse-based analysis is required for the readout.',
    to: '/roles/analytics',
  },
  {
    role: 'Leadership',
    blurb:
      'How FX changes portfolio decisions, what it costs to run, and how to read a readout.',
    to: '/roles/leadership',
  },
];

export default function ExplorePage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-charcoal text-white">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <Eyebrow tone="dark" className="mb-3">
            Feature Experimentation
          </Eyebrow>
          <h1 className="text-display max-w-4xl">
            Ship enhancements with{' '}
            <span className="text-lime underline decoration-lime/60 decoration-[0.18em] underline-offset-[0.14em] [text-decoration-skip-ink:none]">
              evidence
            </span>
            , not opinion.
          </h1>
          <p className="mt-4 max-w-3xl text-body-lg md:text-xl text-on-dark-muted">
            A governed way for Product, Engineering, Analytics, and Testing
            &amp; Personalization to validate enhancements on Sample Retail Co&apos;s
            highest-stakes journeys — browse, cart, checkout, payment,
            account management, and internal tools — before they go broadly.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button as={Link} href="/decide" variant="primary" size="lg">
              Should we run an FX test?
            </Button>
            <Button as={Link} href="/process" variant="secondary-dark" size="lg">
              Walk the 8-phase process
            </Button>
            <Button as={Link} href="/use-cases" variant="ghost-dark" size="lg">
              See use cases
            </Button>
          </div>
        </div>
      </section>

      {/* Operating principle — treated as a pull quote: lime left mark, larger heading text, more breathing room */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-12 gap-10 md:gap-16">
            <div className="md:col-span-7">
              <Eyebrow tone="light" className="mb-4">
                Operating principle
              </Eyebrow>
              <div className="border-l-[6px] border-lime pl-6 md:pl-8">
                <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold leading-[1.15] tracking-tight text-charcoal">
                  FX is not an approval layer. It is how meaningful
                  enhancements get{' '}
                  <span className="text-accent">planned</span>,{' '}
                  <span className="text-accent">released</span>, and{' '}
                  <span className="text-accent">measured</span>.
                </h2>
              </div>
            </div>
            <div className="md:col-span-5">
              <p className="text-body-lg text-body">
                The goal is not &quot;more tests.&quot; The goal is better release
                decisions, lower rollout risk, cleaner measurement, and a
                stronger connection between enhancement velocity and business
                outcomes.
              </p>
              <Callout
                variant="subtle"
                title="Simple decision rule"
                className="mt-6"
              >
                <p>
                  Use FX when the enhancement is{' '}
                  <span className="font-semibold">important enough</span> that
                  we would want to know whether it worked,{' '}
                  <span className="font-semibold">risky enough</span> that we
                  would want controlled rollout, or{' '}
                  <span className="font-semibold">strategic enough</span> that
                  the results should influence future roadmap decisions.
                </p>
              </Callout>
            </div>
          </div>
        </div>
      </section>

      {/* Five reasons */}
      <section className="bg-subtle">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="Why we use FX"
            title="Five reasons to put an enhancement through FX"
            underline
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {reasons.map((r, i) => (
              <Card key={i} hoverable>
                <div className="flex items-center gap-4 mb-5">
                  <div className="text-5xl md:text-6xl font-bold text-accent leading-none tracking-tighter tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div
                    aria-hidden="true"
                    className="h-px flex-1 bg-muted/30"
                  />
                </div>
                <div className="text-h4 text-charcoal mb-2">{r.title}</div>
                <div className="text-body-sm text-muted">{r.body}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Role landing zones — vertical directory listing to break the card-grid rhythm above */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <SectionHeader
            eyebrow="For your role"
            title="Start where you fit"
            intro="Each stakeholder owns a different part of the FX workflow. Jump to the view that matches your role."
            underline
          />

          <div className="mt-10 border-t border-muted/30">
            {audiences.map((a, i) => (
              <Link
                key={a.role}
                href={a.to}
                className="group flex items-start sm:items-center gap-5 sm:gap-8 py-6 border-b border-muted/30 hover:bg-subtle transition px-4 -mx-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
              >
                <div className="text-2xl font-bold text-accent w-10 flex-shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-h3 text-charcoal group-hover:text-charcoal">
                    {a.role}
                  </div>
                  <p className="text-body-sm text-muted mt-1">{a.blurb}</p>
                </div>
                <div className="hidden sm:flex text-body-sm text-accent font-semibold items-center gap-2 flex-shrink-0 group-hover:translate-x-1 transition-transform">
                  Open
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>

          {/* Distinct reference lane — promoted out of the role list so it doesn't read
              as a sixth audience. Different number style (✶) and a kicker eyebrow. */}
          <Link
            href="/concepts"
            className="group mt-10 flex items-start sm:items-center gap-5 sm:gap-8 p-6 sm:p-8 bg-subtle hover:bg-charcoal hover:text-on-dark transition rounded-lg border border-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
          >
            <div
              aria-hidden="true"
              className="text-3xl text-accent group-hover:text-accent-on-dark flex-shrink-0"
            >
              ✶
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-eyebrow uppercase text-accent group-hover:text-accent-on-dark mb-1">
                Reference layer
              </div>
              <div className="text-h3 text-charcoal group-hover:text-on-dark">
                Concepts &amp; vocabulary
              </div>
              <p className="text-body-sm text-muted group-hover:text-on-dark-muted mt-1 max-w-2xl">
                Short summaries of every Feature Experimentation term used across this site, linked to Optimizely&apos;s source docs. Hover any underlined term anywhere on the site for a definition.
              </p>
            </div>
            <div className="hidden sm:flex text-body-sm font-semibold items-center gap-2 flex-shrink-0 text-accent group-hover:text-accent-on-dark group-hover:translate-x-1 transition-transform">
              Open
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </Link>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-charcoal-alt text-white">
        <div className="max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <Eyebrow tone="dark">Have an enhancement in mind?</Eyebrow>
            <div className="text-h2 md:text-h2-lg mt-2 max-w-2xl">
              Walk it through the qualification quiz and get a recommendation.
            </div>
          </div>
          <Button
            as={Link}
            href="/decide"
            variant="primary"
            size="lg"
            className="self-start md:self-auto"
          >
            Run the qualification quiz →
          </Button>
        </div>
      </section>
    </>
  );
}
