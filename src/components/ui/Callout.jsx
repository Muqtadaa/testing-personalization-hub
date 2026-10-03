import Eyebrow from './Eyebrow.jsx';

const VARIANTS = {
  // Lime tint background with lime left border — used for "phase output" style callouts
  'lime-tint': 'bg-lime/10 border-l-4 border-lime rounded-r p-4',
  // Subtle gray background with lime left border — used for "simple decision rule" style callouts
  subtle: 'bg-subtle border-l-4 border-lime rounded-r p-5',
  // Plain subtle background, no border accent — used for metadata strips
  plain: 'bg-subtle rounded-md p-4',
};

export default function Callout({
  variant = 'subtle',
  eyebrow = '',
  title = '',
  className = '',
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.subtle;
  return (
    <div className={`${v} ${className}`} {...rest}>
      {eyebrow && (
        <Eyebrow tone="light" className={title ? 'mb-1' : 'mb-2'}>
          {eyebrow}
        </Eyebrow>
      )}
      {title && (
        <div className="text-body-sm font-bold text-charcoal mb-1">{title}</div>
      )}
      {children && <div className="text-body">{children}</div>}
    </div>
  );
}
