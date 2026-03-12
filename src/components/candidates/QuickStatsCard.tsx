import { Card } from '@/components/ui/Card';
import type { CandidateQuickStats } from '@/types';

interface QuickStatsCardProps {
  stats: CandidateQuickStats;
  updatedAt: string;
}

export function QuickStatsCard({ stats, updatedAt }: QuickStatsCardProps) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-primary)]">
          Quick Stats
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          Updated {updatedAt}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Years of Experience', value: stats.yearsOfExperience },
          { label: 'Location', value: stats.location },
          { label: 'Availability', value: stats.availability },
          { label: 'Salary Expectation', value: stats.salaryExpectation },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-[var(--color-surface)] rounded-lg p-3 space-y-1"
          >
            <p className="text-[11px] text-[var(--color-text-muted)] leading-tight">
              {label}
            </p>
            <p className="text-sm font-semibold text-[var(--color-primary)] leading-snug">
              {value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
