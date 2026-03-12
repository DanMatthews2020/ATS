import { Calendar, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import type { PipelineCandidate, PipelineStage, BadgeVariant } from '@/types';

interface PipelineCandidateCardProps {
  candidate: PipelineCandidate;
  viewMode: 'grid' | 'list';
}

const STAGE_CONFIG: Record<PipelineStage, { label: string; variant: BadgeVariant }> = {
  applied: { label: 'Applied', variant: 'default' },
  screening: { label: 'Screening', variant: 'info' },
  interview: { label: 'Interview', variant: 'warning' },
  technical: { label: 'Technical', variant: 'warning' },
  offer: { label: 'Offer', variant: 'success' },
  hired: { label: 'Hired', variant: 'success' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function ScoreIndicator({ score }: { score: number }) {
  const colorClass =
    score >= 85
      ? 'text-emerald-600'
      : score >= 70
        ? 'text-amber-500'
        : 'text-neutral-400';

  return (
    <span
      className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${colorClass}`}
      aria-label={`Score: ${score}`}
    >
      <Star size={11} fill="currentColor" aria-hidden="true" />
      {score}
    </span>
  );
}

export function PipelineCandidateCard({
  candidate,
  viewMode,
}: PipelineCandidateCardProps) {
  const stageConfig = STAGE_CONFIG[candidate.stage];

  if (viewMode === 'list') {
    return (
      <Card
        padding="sm"
        className="hover:shadow-card-hover transition-shadow duration-200 cursor-pointer"
      >
        <div className="flex items-center gap-4 px-2 py-1">
          <Avatar name={candidate.name} size="sm" />

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[var(--color-primary)] leading-snug truncate">
              {candidate.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">
              {candidate.role}
            </p>
          </div>

          <Badge variant={stageConfig.variant}>{stageConfig.label}</Badge>

          <ScoreIndicator score={candidate.score} />

          <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--color-text-muted)] flex-shrink-0">
            <Calendar size={11} aria-hidden="true" />
            {formatDate(candidate.appliedAt)}
          </div>

          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
            {candidate.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
      padding="md"
      className="hover:shadow-card-hover transition-shadow duration-200 cursor-pointer flex flex-col gap-4"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={candidate.name} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-sm text-[var(--color-primary)] leading-snug truncate">
              {candidate.name}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
              {candidate.role}
            </p>
          </div>
        </div>
        <ScoreIndicator score={candidate.score} />
      </div>

      {/* Stage + Date */}
      <div className="flex items-center justify-between">
        <Badge variant={stageConfig.variant}>{stageConfig.label}</Badge>
        <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
          <Calendar size={11} aria-hidden="true" />
          {formatDate(candidate.appliedAt)}
        </div>
      </div>

      {/* Tags */}
      {candidate.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[var(--color-border)]">
          {candidate.tags.map((tag) => (
            <Badge key={tag} variant="default">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
