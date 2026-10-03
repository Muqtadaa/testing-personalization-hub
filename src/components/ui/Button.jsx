const VARIANTS = {
  primary:
    'bg-lime text-charcoal hover:bg-lime-500 shadow-card font-semibold',
  secondary:
    'border-2 border-charcoal text-charcoal hover:bg-charcoal hover:text-white font-semibold',
  'secondary-dark':
    'border border-lime/40 text-white hover:bg-charcoal-alt font-semibold',
  ghost:
    'border border-muted text-charcoal hover:bg-subtle font-semibold',
  'ghost-dark':
    'border border-white/20 text-white/90 hover:bg-charcoal-alt font-semibold',
};

const SIZES = {
  sm: 'px-4 py-2.5 text-sm rounded',
  md: 'px-5 py-2.5 text-sm rounded',
  lg: 'px-6 py-3 text-base rounded-md',
  xl: 'px-8 py-4 text-base rounded-md',
};

const BASE = 'inline-flex items-center justify-center gap-2 transition disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2';

/**
 * @param {{ variant?: string, size?: string, as?: import('react').ElementType,
 *   className?: string, type?: string, children?: import('react').ReactNode,
 *   [prop: string]: any }} props
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  as: Tag = 'button',
  className = '',
  type = undefined,
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const typeProp = Tag === 'button' ? { type: type || 'button' } : {};
  return (
    <Tag className={`${BASE} ${v} ${s} ${className}`} {...typeProp} {...rest}>
      {children}
    </Tag>
  );
}
