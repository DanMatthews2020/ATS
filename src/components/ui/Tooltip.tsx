import type { ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const POSITION_CLASSES: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function Tooltip({
  content,
  children,
  position = 'top',
}: TooltipProps) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={[
          'absolute z-50 px-2.5 py-1.5 text-xs font-medium',
          'bg-neutral-900 text-white rounded-lg shadow-lg',
          'max-w-xs whitespace-nowrap pointer-events-none',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          'transition-opacity duration-150',
          POSITION_CLASSES[position],
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {content}
      </span>
    </span>
  );
}
