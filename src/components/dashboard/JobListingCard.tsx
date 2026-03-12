import { MapPin, Clock, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Job, BadgeVariant } from '@/types';

interface JobListingCardProps {
  job: Job;
}

const STATUS_CONFIG: Record<Job['status'], { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'success' },
  closed: { label: 'Closed', variant: 'error' },
  draft: { label: 'Draft', variant: 'default' },
};

const TYPE_LABELS: Record<Job['type'], string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
};

export function JobListingCard({ job }: JobListingCardProps) {
  const statusConfig = STATUS_CONFIG[job.status];

  return (
    <Card
      padding="md"
      className="hover:shadow-card-hover transition-shadow duration-200 cursor-pointer flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--color-primary)] text-sm leading-snug truncate">
            {job.title}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {job.department}
          </p>
        </div>
        <Badge variant={statusConfig.variant} className="flex-shrink-0">
          {statusConfig.label}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed line-clamp-2 flex-1">
        {job.description}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1.5">
          <MapPin size={11} aria-hidden="true" />
          {job.location}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={11} aria-hidden="true" />
          {TYPE_LABELS[job.type]}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]">
        <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Users size={12} aria-hidden="true" />
          {job.applicantCount} applicants
        </span>
        <Button variant="primary" size="sm">
          View
        </Button>
      </div>
    </Card>
  );
}
