// External-link primitive — every outbound link to Optimizely (or anywhere off-site)
// should go through this component. It enforces:
//   - target="_blank" + rel="noreferrer noopener" so opening in a new tab is safe
//   - a consistent external-link icon at the end, aria-hidden (the link text already conveys it)
//   - the right hover/focus treatment on both light and dark surfaces
//
// Use `tone="dark"` whenever the link is sitting on a dark surface (charcoal hero,
// dark Card variant, navy strip). Default is the light-surface treatment.

const TONE = {
  light:
    'text-accent hover:text-charcoal underline decoration-1 underline-offset-2 decoration-accent/40 hover:decoration-charcoal',
  dark: 'text-accent-on-dark hover:text-white underline decoration-1 underline-offset-2 decoration-accent-on-dark/40 hover:decoration-white',
  inherit:
    'underline decoration-1 underline-offset-2 decoration-current/40 hover:decoration-current',
};

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 rounded-sm';

export default function ExternalLink({
  href,
  tone = 'light',
  className = '',
  children,
  ...rest
}) {
  const t = TONE[tone] || TONE.light;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`group/extlink inline-flex items-baseline gap-1 font-medium transition ${t} ${FOCUS} ${className}`}
      {...rest}
    >
      <span>{children}</span>
      <span className="sr-only"> (opens in a new tab)</span>
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="flex-shrink-0 translate-y-px transition-transform motion-safe:group-hover/extlink:translate-x-0.5 motion-safe:group-hover/extlink:-translate-y-px"
      >
        <path
          d="M14 5h5v5M19 5l-9 9M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
