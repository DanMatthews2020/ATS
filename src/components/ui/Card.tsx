import type { HTMLAttributes, ReactNode } from 'react';
import type { CardPadding } from '@/types';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  children: ReactNode;
}

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

export function Card({
  padding = 'md',
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={[
        'bg-white rounded-xl border border-[var(--color-border)] shadow-card',
        PADDING_CLASSES[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
