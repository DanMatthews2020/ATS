'use client';

import { Check } from 'lucide-react';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
  error,
  disabled,
  required,
  id,
}: CheckboxProps) {
  const inputId =
    id ?? label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={[
          'inline-flex items-start gap-2.5 select-none',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Hidden native checkbox */}
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          required={required}
          className="sr-only peer"
        />

        {/* Custom square */}
        <span
          aria-hidden="true"
          className={[
            'flex-shrink-0 mt-0.5 w-4.5 h-4.5 w-[18px] h-[18px] rounded-md border',
            'flex items-center justify-center',
            'transition-colors duration-150',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2',
            checked
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
              : error
                ? 'bg-white border-red-400'
                : 'bg-white border-[var(--color-border)]',
            checked
              ? 'peer-focus-visible:ring-neutral-900'
              : 'peer-focus-visible:ring-neutral-400',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {checked ? <Check size={12} className="text-white" strokeWidth={3} /> : null}
        </span>

        <span className="text-sm text-[var(--color-text-primary)] leading-snug">
          {label}
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-xs text-red-500 ml-[26px]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[var(--color-text-muted)] ml-[26px]">{hint}</p>
      ) : null}
    </div>
  );
}
