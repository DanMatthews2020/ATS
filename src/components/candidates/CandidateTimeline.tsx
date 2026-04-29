'use client';

import { useState, useEffect } from 'react';
import {
  Send, Calendar, CalendarClock, CalendarX2,
  ClipboardList, ClipboardCheck, Bell,
  MessageSquare, AtSign, ArrowRight,
  Mail, UserPlus, Activity, Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { timelineApi } from '@/lib/api';
import { relativeTime } from '@/lib/relativeTime';

// ── Types ────────────────────────────────────────────────────────────────────

interface TimelineEventDto {
  id: string;
  type: string;
  actorName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface Props {
  candidateId: string;
  applicationId?: string;
}

// ── Event mapping ────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { icon: React.ElementType; label: string | ((e: TimelineEventDto) => string) }> = {
  SCHEDULING_LINK_SENT:     { icon: Send,            label: 'Scheduling link sent' },
  INTERVIEW_SCHEDULED:      { icon: Calendar,        label: 'Interview scheduled' },
  INTERVIEW_RESCHEDULED:    { icon: CalendarClock,   label: 'Interview rescheduled' },
  INTERVIEW_CANCELLED:      { icon: CalendarX2,      label: 'Interview cancelled' },
  FEEDBACK_REQUESTED:       { icon: ClipboardList,   label: 'Feedback requested' },
  FEEDBACK_SUBMITTED:       { icon: ClipboardCheck,  label: (e) => {
    const name = (e.metadata?.actorName as string) || e.actorName;
    return name ? `Feedback submitted by ${name}` : 'Feedback submitted';
  }},
  FEEDBACK_REMINDER_SENT:   { icon: Bell,            label: 'Feedback reminder sent' },
  COMMENT_ADDED:            { icon: MessageSquare,   label: 'Comment added' },
  MENTION_CREATED:          { icon: AtSign,          label: 'You were mentioned' },
  APPLICATION_STAGE_CHANGED:{ icon: ArrowRight,      label: (e) => {
    const stage = e.metadata?.stageName as string | undefined;
    return stage ? `Moved to ${stage}` : 'Stage changed';
  }},
  OFFER_SENT:               { icon: Mail,            label: 'Offer sent' },
  CANDIDATE_CREATED:        { icon: UserPlus,        label: 'Candidate added' },
};

// ── Component ────────────────────────────────────────────────────────────────

export function CandidateTimeline({ candidateId, applicationId }: Props) {
  const [events, setEvents] = useState<TimelineEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    timelineApi
      .list(candidateId, applicationId)
      .then((d) => setEvents(d.events))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [candidateId, applicationId]);

  if (loading) {
    return (
      <Card padding="lg">
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center py-12 gap-3 text-[var(--color-text-muted)]">
          <Activity size={28} />
          <p className="text-sm">Failed to load timeline.</p>
        </div>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center py-12 gap-3 text-[var(--color-text-muted)]">
          <Activity size={28} />
          <p className="text-sm">No activity yet.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="space-y-0">
        {events.map((event, idx) => {
          const config = EVENT_CONFIG[event.type] ?? { icon: Activity, label: event.type };
          const Icon = config.icon;
          const label = typeof config.label === 'function' ? config.label(event) : config.label;

          return (
            <div key={event.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className="text-[var(--color-text-muted)]" />
                </div>
                {idx < events.length - 1 && (
                  <div className="w-px flex-1 bg-[var(--color-border)] my-1" style={{ minHeight: 24 }} />
                )}
              </div>
              <div className="pb-5 flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-[var(--color-text-muted)]">{relativeTime(event.createdAt)}</p>
                  {event.actorName && (
                    <p className="text-xs text-[var(--color-text-muted)]">· {event.actorName}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
