import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { MOCK_APPLICATION_STATUSES } from '@/lib/constants';

export function ApplicationsStatusPanel() {
  return (
    <Card padding="md" className="h-fit">
      <h2 className="text-base font-semibold text-[var(--color-primary)] mb-4">
        Applications Status
      </h2>

      <ul className="divide-y divide-[var(--color-border)]" role="list">
        {MOCK_APPLICATION_STATUSES.map((entry) => (
          <li
            key={entry.id}
            className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-primary)] leading-snug truncate">
                {entry.jobTitle}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {entry.appliedAgo}
              </p>
            </div>
            <Link
              href={`/candidates/${entry.candidateId}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-100 whitespace-nowrap outline-none focus-visible:underline"
            >
              {entry.candidateName}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
