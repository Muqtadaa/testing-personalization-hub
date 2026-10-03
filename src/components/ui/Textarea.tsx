import type { TextareaHTMLAttributes } from 'react';
import { CONTROL_BASE, controlBorder } from './Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

// Multiline control sharing the form-control vocabulary.
export default function Textarea({ error = false, className = '', ...rest }: TextareaProps) {
  return (
    <textarea
      className={`${CONTROL_BASE} ${controlBorder(error)} resize-y leading-relaxed ${className}`}
      aria-invalid={error || undefined}
      {...rest}
    />
  );
}
