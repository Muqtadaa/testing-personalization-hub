import type { ReactNode } from 'react';

// Label + optional helper/error wrapper for a form control. Pair with
// Input/Select/Textarea. Error text uses the critical token.

interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  helper?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export default function Field({
  label = '',
  htmlFor = '',
  helper = '',
  error = '',
  required = false,
  className = '',
  children,
}: FieldProps) {
  const message = error || helper;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="block text-body-sm font-semibold text-charcoal mb-1.5">
          {label}
          {required && (
            <span className="text-critical-text" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {children}
      {message && (
        <p
          className={`mt-1.5 text-caption leading-snug ${
            error ? 'text-critical-text' : 'text-subtle'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
