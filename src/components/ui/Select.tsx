import type { SelectHTMLAttributes } from 'react';
import { CONTROL_BASE, controlBorder } from './Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

// Select sharing the form-control vocabulary. `pr-8` leaves room for the chevron.
export default function Select({ error = false, className = '', children, ...rest }: SelectProps) {
  return (
    <select
      className={`${CONTROL_BASE} ${controlBorder(error)} pr-8 cursor-pointer ${className}`}
      aria-invalid={error || undefined}
      {...rest}
    >
      {children}
    </select>
  );
}
