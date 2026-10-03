// Small, dim attribution line for pages that quote or summarize Optimizely's
// docs. Placed at the top and (optionally) bottom of /concepts and anywhere
// else a substantial concept summary is embedded.

import ExternalLink from './ExternalLink.jsx';

const TONE = {
  light: 'text-subtle',
  dark: 'text-on-dark-subtle',
};

export default function Attribution({ tone = 'light', className = '' }) {
  const t = TONE[tone] || TONE.light;
  const linkTone = tone === 'dark' ? 'dark' : 'light';
  return (
    <p className={`text-caption ${t} ${className}`}>
      Concept summaries are adapted from{' '}
      <ExternalLink
        href="https://docs.developers.optimizely.com/feature-experimentation/docs/introduction"
        tone={linkTone}
      >
        docs.developers.optimizely.com
      </ExternalLink>
      . Optimizely and Feature Experimentation are trademarks of Optimizely, Inc.
    </p>
  );
}
