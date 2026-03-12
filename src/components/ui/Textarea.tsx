import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}: TextareaProps) {
  const textareaId =
    id ?? label?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          {label}
        </label>
      ) : null}

      <textarea
        {...props}
        id={textareaId}
        className={[
          'w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white resize-none',
          'text-[var(--color-text-primary)]',
          'placeholder:text-[var(--color-text-muted)]',
          'outline-none transition-colors duration-150',
          'focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
            : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/10',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />

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
