import { Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import type { Candidate, CandidateStatus, BadgeVariant } from '@/types';

interface CandidateCardProps {
  candidate: Candidate;
}

const STATUS_CONFIG: Record<CandidateStatus, { label: string; variant: BadgeVariant }> = {
  new: { label: 'New', variant: 'info' },
  screening: { label: 'Screening', variant: 'warning' },
  interview: { label: 'Interview', variant: 'info' },
  offer: { label: 'Offer', variant: 'success' },
  hired: { label: 'Hired', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function CandidateCard({ candidate }: CandidateCardProps) {
  const statusConfig = STATUS_CONFIG[candidate.status];

  return (
    <Card
      padding="md"
      className="hover:shadow-card-hover transition-shadow duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <Avatar name={candidate.name} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm text-[var(--color-primary)] truncate leading-snug">
                {candidate.name}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                {candidate.role}
              </p>
            </div>
            <Badge variant={statusConfig.variant} className="flex-shrink-0">
              {statusConfig.label}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 mt-2 text-xs text-[var(--color-text-muted)]">
            <Calendar size={11} aria-hidden="true" />
            <span>Applied {formatDate(candidate.appliedAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
