import type { InputHTMLAttributes } from 'react';

// Shared text input. One form-control vocabulary across the hub (Intake forms,
// Pre-Analysis, the Concepts filter). States: default / focus / disabled / error.

export const CONTROL_BASE =
  'w-full rounded-md bg-white text-charcoal text-body-sm px-3 py-2 border transition placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-subtle';

export function controlBorder(error?: boolean): string {
  return error
    ? 'border-critical-border focus-visible:border-critical'
    : 'border-muted/40 focus-visible:border-charcoal';
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export default function Input({ error = false, className = '', ...rest }: InputProps) {
  return (
    <input
      className={`${CONTROL_BASE} ${controlBorder(error)} ${className}`}
      aria-invalid={error || undefined}
      {...rest}
    />
  );
}
