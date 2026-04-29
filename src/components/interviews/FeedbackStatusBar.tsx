'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2, Clock, AlertTriangle, Loader2, AlertCircle,
  Star, ClipboardList,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { feedbackApi } from '@/lib/api';
import type { BadgeVariant } from '@/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface FeedbackRequestItem {
  userId: string;
  userName: string;
  status: 'PENDING' | 'SUBMITTED' | 'OVERDUE';
  submittedAt: string | null;
  scorecard: { rating: number; recommendation: string; notes: string } | null;
  locked: boolean;
}

interface FeedbackStatusResponse {
  requests: FeedbackRequestItem[];
  summary: { total: number; submitted: number; pending: number; overdue: number };
}

interface Props {
  interviewId: string;
  currentUserRole: string;
  currentUserId: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING:   { label: 'Pending',   variant: 'warning' },
  SUBMITTED: { label: 'Submitted', variant: 'success' },
  OVERDUE:   { label: 'Overdue',   variant: 'error' },
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PENDING:   Clock,
  SUBMITTED: CheckCircle2,
  OVERDUE:   AlertTriangle,
};

// ── Component ────────────────────────────────────────────────────────────────

export function FeedbackStatusBar({ interviewId, currentUserRole, currentUserId }: Props) {
  const [data, setData] = useState<FeedbackStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    feedbackApi
      .getStatus(interviewId)
      .then(setData)
      .catch(() => setError('Failed to load feedback status'))
      .finally(() => setLoading(false));
  }, [interviewId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
        <AlertCircle size={14} className="shrink-0" />
        {error ?? 'No data'}
      </div>
    );
  }

  if (data.requests.length === 0) return null;

  const isInterviewer = currentUserRole === 'INTERVIEWER';

  return (
    <div className="space-y-3">
      {/* Summary */}
      {!isInterviewer && data.summary.total > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <ClipboardList size={13} />
          <span className="font-medium">
            {data.summary.submitted} of {data.summary.total} submitted
          </span>
          {data.summary.overdue > 0 && (
            <span className="text-red-600 font-medium">
              ({data.summary.overdue} overdue)
            </span>
          )}
        </div>
      )}

      {/* Rows */}
      <div className="space-y-2">
        {data.requests.map((req) => {
          const cfg = STATUS_BADGE[req.status] ?? STATUS_BADGE.PENDING;
          const Icon = STATUS_ICON[req.status] ?? Clock;

          return (
            <div
              key={req.userId}
              className="flex items-start gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-white"
            >
              <Avatar name={req.userName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {req.userName}
                  </span>
                  <Badge variant={cfg.variant}>
                    <Icon size={10} className="mr-0.5" />
                    {cfg.label}
                  </Badge>
                </div>

                {/* INTERVIEWER: own status */}
                {isInterviewer && req.userId === currentUserId && (
                  <>
                    {req.status === 'SUBMITTED' && req.submittedAt && (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Feedback submitted {new Date(req.submittedAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    )}
                    {req.status !== 'SUBMITTED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="mt-1.5"
                        onClick={() => {
                          // Navigate to interview feedback
                          window.location.href = `/interviews?feedback=${interviewId}`;
                        }}
                      >
                        Submit your feedback
                      </Button>
                    )}
                  </>
                )}

                {/* ADMIN/HR/MANAGER: all rows */}
                {!isInterviewer && (
                  <>
                    {req.locked && (
                      <p className="text-xs text-[var(--color-text-muted)] italic">
                        Awaiting feedback
                      </p>
                    )}
                    {req.scorecard && (
                      <div className="mt-1.5 p-2.5 rounded-lg bg-[var(--color-surface)]">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                size={11}
                                className={s <= req.scorecard!.rating
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-neutral-300'}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-medium text-[var(--color-text-secondary)] capitalize">
                            {req.scorecard.recommendation.replace('-', ' ')}
                          </span>
                        </div>
                        {req.scorecard.notes && (
                          <p className="text-xs text-[var(--color-text-muted)] line-clamp-3">
                            {req.scorecard.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
