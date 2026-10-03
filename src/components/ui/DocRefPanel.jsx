// Reusable "Optimizely docs for this {phase / role / template}" block.
// Used in three contexts; extract once, not three times.
//
// refKeys is an array of keys into the optimizelyRefs map. Unknown keys are
// silently filtered out so a typo in data files never crashes a page.

import { optimizelyRefs } from '../../data/optimizelyRefs.js';
import Card from './Card.jsx';
import Eyebrow from './Eyebrow.jsx';
import ExternalLink from './ExternalLink.jsx';

const KIND_LABEL = {
  concept: 'Concept',
  howto: 'How-to',
  reference: 'Reference',
};

const KIND_DOT = {
  concept: 'bg-lime',
  howto: 'bg-charcoal',
  reference: 'bg-muted',
};

export default function DocRefPanel({
  eyebrow = 'Optimizely reference',
  title = 'Docs for this section',
  refKeys = [],
  variant = 'default',
  className = '',
}) {
  const refs = refKeys
    .map((k) => ({ key: k, ref: optimizelyRefs[k] }))
    .filter(({ ref }) => ref);

  if (refs.length === 0) return null;

  return (
    <Card variant={variant} padding="md" className={className}>
      <div className="mb-4">
        <Eyebrow tone="light" className="mb-1">
          {eyebrow}
        </Eyebrow>
        <h3 className="text-h4 text-charcoal">{title}</h3>
      </div>
      <ul className="space-y-3">
        {refs.map(({ key, ref }) => (
          <li
            key={key}
            className="flex flex-col sm:flex-row sm:items-baseline gap-x-3 gap-y-1 py-2 border-t border-muted/30 first:border-t-0 first:pt-0"
          >
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span
                aria-label={`${KIND_LABEL[ref.kind] || 'Reference'} link`}
                className="inline-flex items-center gap-1.5 text-caption font-bold uppercase tracking-eyebrow text-charcoal"
              >
                <span
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-sm flex-shrink-0 ${KIND_DOT[ref.kind] || 'bg-muted'}`}
                />
                {KIND_LABEL[ref.kind] || 'Doc'}
              </span>
              <ExternalLink href={ref.url} tone="light">
                {ref.title}
              </ExternalLink>
            </div>
            <p className="text-body-sm text-muted flex-1">{ref.blurb}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
