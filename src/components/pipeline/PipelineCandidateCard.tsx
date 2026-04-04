import { Star, Calendar, ClipboardList } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { PipelineApplicationDto } from '@/lib/api';

interface PipelineCandidateCardProps {
  app: PipelineApplicationDto;
  isDragging?: boolean;
  isFiltered?: boolean;
  stageScorecardRequired?: boolean;
  onClick: () => void;
  onSkillClick: (skill: string) => void;
}

export function PipelineCandidateCard({
  app,
  isDragging,
  isFiltered,
  stageScorecardRequired,
  onClick,
  onSkillClick,
}: PipelineCandidateCardProps) {
  const scoreColor =
    app.score >= 85 ? 'text-emerald-600' :
    app.score >= 70 ? 'text-amber-500' :
    'text-neutral-400';

  return (
    <div
      onClick={onClick}
      className={[
        'bg-white rounded-xl border border-[var(--color-border)] p-3 cursor-pointer select-none',
        'hover:shadow-md hover:border-neutral-300 transition-all duration-150',
        isDragging  ? 'shadow-xl rotate-1 border-[var(--color-primary)]/40 opacity-95' : 'shadow-card',
        isFiltered  ? 'opacity-30' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Header: avatar + name + score */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={app.candidateName} size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate leading-snug">
              {app.candidateName}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] truncate">
              {app.candidateEmail}
            </p>
          </div>
        </div>
        <span className={`flex items-center gap-0.5 text-xs font-bold flex-shrink-0 ${scoreColor}`}>
          <Star size={10} fill="currentColor" />
          {app.score}
        </span>
      </div>

      {/* Skills (max 3, overflow count) */}
      {app.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {app.skills.slice(0, 3).map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={(e) => { e.stopPropagation(); onSkillClick(skill); }}
              className="text-[10px] px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-colors"
            >
              {skill}
            </button>
          ))}
          {app.skills.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 text-[var(--color-text-muted)]">
              +{app.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: date + interview count + scorecard status */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
          <Calendar size={9} />
          {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <div className="flex items-center gap-1.5">
          {app.interviewCount > 0 && (
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {app.interviewCount} interview{app.interviewCount !== 1 ? 's' : ''}
            </span>
          )}
          {stageScorecardRequired && (
            <ClipboardList size={11} className="text-amber-500" aria-label="Scorecard required" />
          )}
        </div>
      </div>
    </div>
  );
}
