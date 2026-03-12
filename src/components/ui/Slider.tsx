'use client';

import type { ChangeEvent } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className = '',
}: SliderProps) {
  const sliderId = `slider-${label.toLowerCase().replace(/\s+/g, '-')}`;

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(Number(e.target.value));
  }

  return (
    <div className={['space-y-2', className].filter(Boolean).join(' ')}>
      <label
        htmlFor={sliderId}
        className="block text-xs font-medium text-[var(--color-text-primary)]"
      >
        {label}
      </label>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      />
    </div>
  );
}
