import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Renders a <textarea> instead of <input> when true */
  multiline?: boolean;
  /** Number of visible text rows when multiline is true. Defaults to 5. */
  rows?: number;
}

// Shared visual classes for both <input> and <textarea>
function buildFieldClasses(error: string | undefined, extra: string): string {
  return [
    'w-full rounded-xl border px-3.5 text-sm bg-white',
    'text-[var(--color-text-primary)]',
    'placeholder:text-[var(--color-text-muted)]',
    'outline-none transition-colors duration-150',
    'focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
    error
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
      : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/10',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

export function Input({
  label,
  error,
  hint,
  id,
  className = '',
  multiline = false,
  rows = 5,
  ...props
}: InputProps) {
  const inputId =
    id ?? label?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          {label}
        </label>
      ) : null}

      {multiline ? (
        <textarea
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          id={inputId}
          rows={rows}
          className={buildFieldClasses(error, ['py-2.5 resize-none', className].filter(Boolean).join(' '))}
        />
      ) : (
        <input
          {...props}
          id={inputId}
          className={buildFieldClasses(error, ['h-10', className].filter(Boolean).join(' '))}
        />
      )}

      {error ? (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
