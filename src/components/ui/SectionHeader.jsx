import Eyebrow from './Eyebrow.jsx';

const SIZES = {
  h2: 'text-h2 md:text-h2-lg',
  h3: 'text-h3',
  h4: 'text-h4',
};

export default function SectionHeader({
  eyebrow,
  title,
  intro,
  size = 'h2',
  as: Tag,
  tone = 'light',
  underline = false,
  align = 'left',
  className = '',
}) {
  const HeadingTag = Tag || (size === 'h2' ? 'h2' : size === 'h3' ? 'h3' : 'h4');
  const sizeCls = SIZES[size] || SIZES.h2;
  const titleColor = tone === 'dark' ? 'text-on-dark' : 'text-charcoal';
  const introColor = tone === 'dark' ? 'text-on-dark-muted' : 'text-muted';
  const eyebrowTone = tone === 'dark' ? 'dark' : 'light';
  const alignCls = align === 'center' ? 'text-center' : '';
  return (
    <div className={`${alignCls} ${className}`}>
      {eyebrow && (
        <Eyebrow tone={eyebrowTone} className="mb-2">
          {eyebrow}
        </Eyebrow>
      )}
      <HeadingTag
        className={`${sizeCls} ${titleColor} ${underline ? 'accent-underline' : ''}`}
      >
        {title}
      </HeadingTag>
      {intro && (
        <p className={`mt-5 max-w-3xl text-body-lg ${introColor}`}>{intro}</p>
      )}
    </div>
  );
}
