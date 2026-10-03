// One entry on the /concepts page. Renders:
//   - the term
//   - a 2-4 sentence summary
//   - a "Read on Optimizely docs →" link to the source page
//   - context pills: which phases and roles this term shows up in
//
// The id prop is the anchor target for /concepts#<id> deep links.

import Link from 'next/link';
import Card from './Card.jsx';
import Eyebrow from './Eyebrow.jsx';
import ExternalLink from './ExternalLink.jsx';
import { optimizelyRefs } from '../../data/optimizelyRefs.js';
import { phases } from '../../data/phases.js';
import { roles } from '../../data/roles.js';

const phaseById = phases.reduce((acc, p) => {
  acc[p.id] = p;
  return acc;
}, {});
const roleById = roles.reduce((acc, r) => {
  acc[r.id] = r;
  return acc;
}, {});

export default function ConceptCard({ concept, highlighted = false }) {
  const ref = optimizelyRefs[concept.sourceRef];
  return (
    <Card
      id={concept.id}
      className={`scroll-mt-28 transition ${
        highlighted ? 'ring-2 ring-lime motion-safe:animate-deep-link-pulse' : ''
      }`}
      hoverable
    >
      <Eyebrow tone="light" className="mb-2">
        Concept
      </Eyebrow>
      <h3 className="text-h2 text-charcoal mb-2">{concept.term}</h3>
      {concept.oneLineDef && (
        <p className="text-body-sm text-muted mb-4 leading-relaxed">
          {concept.oneLineDef}
        </p>
      )}
      <p className="text-body text-body mb-5">{concept.summary}</p>

      {ref && (
        <div className="mb-5 pl-3 border-l-2 border-lime">
          <ExternalLink
            href={ref.url}
            tone="light"
            className="font-semibold"
          >
            Read on Optimizely docs
          </ExternalLink>
        </div>
      )}

      {(concept.appearsInPhases?.length > 0 ||
        concept.appearsInRoles?.length > 0) && (
        <div className="pt-4 border-t border-muted/30">
          {concept.appearsInPhases?.length > 0 && (
            <div className="mb-3">
              <Eyebrow tone="muted" className="mb-2">
                Appears in phases
              </Eyebrow>
              <div className="flex flex-wrap gap-2">
                {concept.appearsInPhases.map((id) => {
                  const phase = phaseById[id];
                  if (!phase) return null;
                  return (
                    <Link
                      key={id}
                      href={`/process/${id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-eyebrow border border-muted/60 text-charcoal bg-white hover:bg-charcoal hover:text-on-dark hover:border-charcoal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
                    >
                      {id}. {phase.short}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {concept.appearsInRoles?.length > 0 && (
            <div>
              <Eyebrow tone="muted" className="mb-2">
                Appears in roles
              </Eyebrow>
              <div className="flex flex-wrap gap-2">
                {concept.appearsInRoles.map((id) => {
                  const role = roleById[id];
                  if (!role) return null;
                  return (
                    <Link
                      key={id}
                      href={`/roles/${id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-eyebrow border border-transparent bg-subtle text-charcoal hover:bg-charcoal hover:text-on-dark transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2"
                    >
                      {role.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
