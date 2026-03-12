import type { SearchResultPerson } from '@/types';

interface SkeletonResultCardProps {
  person: SearchResultPerson;
}

export function SkeletonResultCard({ person }: SkeletonResultCardProps) {
  return (
    <div className="relative bg-white border border-[var(--color-border)] rounded-xl shadow-card px-5 py-4 flex items-center gap-4 overflow-hidden">
      {/* Avatar skeleton */}
      <div className="w-12 h-12 rounded-full flex-shrink-0 skeleton" />

      {/* Text skeletons */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="skeleton h-3.5 w-48 rounded" />
        <div className="skeleton h-3 w-64 rounded" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>

      {/* Match % skeleton */}
      <div className="flex-shrink-0 w-14">
        <div className="skeleton h-5 w-12 rounded ml-auto" />
      </div>

      {/* Action skeletons */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <div className="skeleton h-8 w-24 rounded-lg" />
        <div className="skeleton h-8 w-24 rounded-lg" />
      </div>

      {/* Saved to Shortlist banner */}
      {person.savedToShortlist ? (
        <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-primary)] text-white text-xs font-medium text-center py-1">
          Saved to Shortlist
        </div>
      ) : null}
    </div>
  );
}
