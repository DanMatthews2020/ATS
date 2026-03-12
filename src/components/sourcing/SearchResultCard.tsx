import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { SearchResultPerson } from '@/types';

interface SearchResultCardProps {
  person: SearchResultPerson;
  onSave: (id: string) => void;
}

export function SearchResultCard({ person, onSave }: SearchResultCardProps) {
  const matchColor =
    person.matchPercent >= 90
      ? 'text-emerald-700'
      : person.matchPercent >= 80
        ? 'text-blue-700'
        : 'text-amber-700';

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl shadow-card px-5 py-4 flex items-center gap-4 hover:shadow-card-hover transition-shadow duration-200">
      {/* Avatar */}
      <Avatar name={person.name} size="lg" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[var(--color-primary)] leading-snug">
          {person.name}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
          {person.title}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {person.location}
          {person.yearsExp > 0 ? ` | ${person.yearsExp} years` : ''}
        </p>
      </div>

      {/* Match % */}
      <div className="text-right flex-shrink-0 w-14">
        <span className={`text-xl font-bold tabular-nums ${matchColor}`}>
          {person.matchPercent}%
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <Button variant="primary" size="sm">
          Open Profile
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onSave(person.id)}
        >
          {person.savedToShortlist ? 'Saved' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
