// Deterministic avatar with initials — shared by candidate cards across the app

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
] as const;

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
} as const;

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Stable color derived from name's first char code
  const colorClass =
    AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ??
    AVATAR_COLORS[0];

  return (
    <div
      aria-label={name}
      className={[
        'flex items-center justify-center rounded-full font-semibold flex-shrink-0 select-none',
        SIZE_CLASSES[size],
        colorClass,
      ].join(' ')}
    >
      {initials}
    </div>
  );
}
