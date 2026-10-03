const TONE = {
  light: 'text-accent',
  dark: 'text-accent-on-dark',
  muted: 'text-muted',
};

export default function Eyebrow({ tone = 'light', as: Tag = 'div', className = '', children, ...rest }) {
  const color = TONE[tone] || TONE.light;
  return (
    <Tag
      className={`text-eyebrow uppercase ${color} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
