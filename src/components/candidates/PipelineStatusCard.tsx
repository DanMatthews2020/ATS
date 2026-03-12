import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { CandidatePipelineStatus } from '@/types';

interface PipelineStatusCardProps {
  status: CandidatePipelineStatus;
}

export function PipelineStatusCard({ status }: PipelineStatusCardProps) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-primary)]">
          Pipeline Status
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          Applied: {status.appliedAt}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[11px] text-[var(--color-text-muted)] mb-1">
            Current Stage
          </p>
          <Badge variant="warning">{status.currentStage}</Badge>
        </div>

        {/* Stage progression */}
        <div className="flex items-center gap-1 pt-1">
          {['Applied', 'Screening', 'Interview', 'Technical', 'Offer'].map(
            (stage, i, arr) => {
              const stageOrder = [
                'Applied',
                'Screening',
                'Interview',
                'Technical Interview',
                'Offer',
              ];
              const currentIdx = stageOrder.findIndex((s) =>
                status.currentStage.toLowerCase().includes(s.toLowerCase()),
              );
              const isComplete = i <= currentIdx;
              const isLast = i === arr.length - 1;

              return (
                <div key={stage} className="flex items-center flex-1 min-w-0">
                  <div
                    className={[
                      'w-2 h-2 rounded-full flex-shrink-0',
                      isComplete
                        ? 'bg-[var(--color-primary)]'
                        : 'bg-[var(--color-border)]',
                    ].join(' ')}
                    aria-label={stage}
                  />
                  {!isLast ? (
                    <div
                      className={[
                        'h-px flex-1',
                        isComplete
                          ? 'bg-[var(--color-primary)]'
                          : 'bg-[var(--color-border)]',
                      ].join(' ')}
                    />
                  ) : null}
                </div>
              );
            },
          )}
        </div>
        <div className="flex justify-between">
          {['Applied', 'Screening', 'Interview', 'Technical', 'Offer'].map(
            (stage) => (
              <span
                key={stage}
                className="text-[10px] text-[var(--color-text-muted)] text-center"
                style={{ width: '20%' }}
              >
                {stage}
              </span>
            ),
          )}
        </div>
      </div>
    </Card>
  );
}
