const VARIANTS = {
  default:
    'bg-white border border-muted/30 shadow-card text-ink',
  dark:
    'bg-charcoal text-white',
  subtle:
    'bg-subtle border border-muted/30 text-ink',
  bare:
    'bg-white text-ink',
};

const PADDING = {
  none: '',
  sm: 'p-5',
  md: 'p-6',
  lg: 'p-7 md:p-10',
};

const RADIUS = {
  md: 'rounded-md',
  lg: 'rounded-lg',
};

export default function Card({
  variant = 'default',
  padding = 'md',
  radius = 'lg',
  hoverable = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.default;
  const p = PADDING[padding] || '';
  const r = RADIUS[radius] || RADIUS.lg;
  const hover =
    hoverable && variant === 'default'
      ? 'hover:shadow-cardHover hover:border-lime/40 transition'
      : hoverable && variant === 'dark'
        ? 'hover:bg-charcoal-alt transition'
        : hoverable
          ? 'transition'
          : '';
  return (
    <Tag className={`${v} ${p} ${r} ${hover} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
