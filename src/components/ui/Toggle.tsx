'use client';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export function Toggle({ label, checked, onChange, id }: ToggleProps) {
  const toggleId = id ?? `toggle-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <label
      htmlFor={toggleId}
      className="flex items-center gap-2.5 cursor-pointer select-none group"
    >
      <div className="relative">
        <input
          type="checkbox"
          id={toggleId}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        {/* Track */}
        <div
          className={[
            'w-9 h-5 rounded-full transition-colors duration-200',
            checked
              ? 'bg-[var(--color-primary)]'
              : 'bg-[var(--color-border)]',
          ].join(' ')}
        />
        {/* Thumb */}
        <div
          className={[
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm',
            'transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </div>
      <span className="text-xs text-[var(--color-text-primary)] font-medium">
        {label}
      </span>
    </label>
  );
}
