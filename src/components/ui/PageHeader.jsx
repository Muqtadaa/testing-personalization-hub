import Eyebrow from './Eyebrow.jsx';

export default function PageHeader({ eyebrow = '', title = '', intro = '', dark = false, compact = false }) {
  // Compact dark variant: a slim bar used once the user is inside a flow, so the
  // big hero doesn't eat working space. Eyebrow stays inline; intro is dropped.
  if (dark && compact) {
    return (
      <section className="bg-charcoal text-on-dark">
        <div className="max-w-7xl mx-auto flex flex-wrap items-baseline gap-x-3 gap-y-1 px-6 py-3.5 animate-page-enter">
          <h1 className="text-h3 text-on-dark">{title}</h1>
          {eyebrow && (
            <Eyebrow tone="dark" className="mb-0">
              {eyebrow}
            </Eyebrow>
          )}
        </div>
      </section>
    );
  }
  if (dark) {
    return (
      <section className="bg-charcoal text-on-dark">
        <div className="max-w-7xl mx-auto px-6 py-9 md:py-12 animate-page-enter">
          {eyebrow ? (
            <Eyebrow tone="dark" className="mb-2.5">
              {eyebrow}
            </Eyebrow>
          ) : (
            <span aria-hidden="true" />
          )}
          <h1 className="text-h1 md:text-h1-lg accent-underline">{title}</h1>
          {intro && (
            <p className="mt-3 max-w-3xl text-body-lg text-on-dark-muted">
              {intro}
            </p>
          )}
        </div>
      </section>
    );
  }
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-6 pt-9 pb-6 animate-page-enter">
        {eyebrow ? (
          <Eyebrow tone="light" className="mb-2">
            {eyebrow}
          </Eyebrow>
        ) : (
          <span aria-hidden="true" />
        )}
        <h1 className="text-h1 md:text-h1-lg text-charcoal accent-underline">
          {title}
        </h1>
        {intro && (
          <p className="mt-3 max-w-3xl text-body-lg text-muted">{intro}</p>
        )}
      </div>
    </section>
  );
}
