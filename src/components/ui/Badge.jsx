const VARIANTS = {
  primary: 'bg-lime text-charcoal',
  outline: 'bg-white text-charcoal border border-charcoal',
  neutral: 'bg-muted/40 text-ink border border-muted',
  mono: 'bg-subtle text-muted font-mono border border-muted/30',
};

const SIZES = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export default function Badge({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const weightTracking =
    variant === 'mono'
      ? 'tracking-normal'
      : 'font-bold uppercase tracking-eyebrow';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded ${weightTracking} ${v} ${s} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
