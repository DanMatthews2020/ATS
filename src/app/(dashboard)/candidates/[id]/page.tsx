'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, MapPin, Linkedin, Calendar,
  Briefcase, Clock, MessageSquare, Activity, Check, X,
  ChevronDown, MoreHorizontal, Pencil, Trash2, Send,
  UserPlus, RefreshCw, FolderOpen, GitMerge, UserX,
  AlertTriangle, FileText, Star, ExternalLink, Loader2, User, Search, Plus, Shield, Lock, XCircle,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  candidatesApi, candidatePanelApi, followUpsApi, evaluationsApi, interviewsApi, auditLogsApi,
  applicationsApi, rejectionReasonsApi, ApiError,
  type CandidateDetailDto, type CandidateNoteDto,
  type FeedEventDto, type CandidateFeedbackDto, type FollowUpDto, type EvaluationDto,
  type InterviewDto, type AuditLogEntryDto, type RejectionReasonDto,
} from '@/lib/api';
import { getActionLabel } from '@/lib/auditLabels';
import ScheduleInterviewModal from '@/components/interviews/ScheduleInterviewModal';
import ScorecardModal from '@/components/ScorecardModal';
import { CandidateComments } from '@/components/candidates/CandidateComments';
import CandidateEmails from '@/components/candidates/CandidateEmails';
import { CandidateTimeline } from '@/components/candidates/CandidateTimeline';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import type { BadgeVariant, LegalBasis } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const APP_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  new:       { label: 'New',       variant: 'info' },
  screening: { label: 'Screening', variant: 'default' },
  interview: { label: 'Interview', variant: 'warning' },
  offer:     { label: 'Offer',     variant: 'success' },
  hired:     { label: 'Hired',     variant: 'success' },
  rejected:  { label: 'Rejected',  variant: 'error' },
};

const SOURCE_LABELS: Record<string, string> = {
  'job-board':  'Job Board',
  'linkedin':   'LinkedIn',
  'referral':   'Referral',
  'cv-upload':  'CV Upload',
  'manual':     'Manual',
  'agency':     'Agency',
  'event':      'Event',
};

type Tab = 'feed' | 'notes' | 'comments' | 'emails' | 'interviews' | 'feedback' | 'applications' | 'overview' | 'timeline' | 'audit';

const TABS: { id: Tab; label: string }[] = [
  { id: 'feed',         label: 'Feed' },
  { id: 'notes',        label: 'Notes' },
  { id: 'comments',     label: 'Comments' },
  { id: 'emails',       label: 'Emails' },
  { id: 'interviews',   label: 'Interviews' },
  { id: 'feedback',     label: 'Feedback' },
  { id: 'applications', label: 'Applications' },
  { id: 'overview',     label: 'Overview' },
  { id: 'timeline',     label: 'Timeline' },
  { id: 'audit',        label: 'Audit Trail' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function getRetentionLabelFe(c: { retentionStatus: string; retentionExpiresAt?: string }): string {
  if (c.retentionStatus === 'ANONYMISED') return 'Anonymised';
  if (!c.retentionExpiresAt) return 'No expiry set';
  const diffMs = new Date(c.retentionExpiresAt).getTime() - Date.now();
  const days = Math.round(Math.abs(diffMs) / 86_400_000);
  if (diffMs <= 0) return `Expired ${days}d ago`;
  return `Expires in ${days}d`;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-neutral-200 animate-pulse rounded-lg ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="p-8">
      {/* Back */}
      <Skeleton className="h-4 w-32 mb-6" />
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 mb-6 flex gap-5">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-64 mt-3" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      {/* Two-column area */}
      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="w-72 space-y-4 flex-shrink-0">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Feed Tab ─────────────────────────────────────────────────────────────────

function FeedTab({ candidateId }: { candidateId: string }) {
  const [feed, setFeed]       = useState<FeedEventDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    candidatePanelApi.getFeed(candidateId)
      .then((d) => setFeed(d.feed))
      .catch(() => {/* show empty */})
      .finally(() => setLoading(false));
  }, [candidateId]);

  const iconMap: Record<string, React.ElementType> = {
    applied:             Briefcase,
    stage_changed:       Activity,
    interview_scheduled: Calendar,
    interview_completed: Check,
    offer_sent:          FileText,
    offer_accepted:      Check,
    offer_rejected:      X,
    note_added:          MessageSquare,
  };

  if (loading) {
    return (
      <Card padding="lg">
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      </Card>
    );
  }

  if (feed.length === 0) {
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
        {feed.map((item, idx) => {
          const Icon = iconMap[item.type] ?? Activity;
          return (
            <div key={item.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className="text-[var(--color-text-muted)]" />
                </div>
                {idx < feed.length - 1 && (
                  <div className="w-px flex-1 bg-[var(--color-border)] my-1" style={{ minHeight: 24 }} />
                )}
              </div>
              <div className="pb-5 flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.description}</p>
                {item.jobTitle && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{item.jobTitle}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-[var(--color-text-muted)]">{fmtDateTime(item.timestamp)}</p>
                  {item.actor && (
                    <p className="text-xs text-[var(--color-text-muted)]">· {item.actor}</p>
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

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ candidateId }: { candidateId: string }) {
  const { showToast } = useToast();
  const [notes, setNotes]       = useState<CandidateNoteDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving]     = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const load = useCallback(() => {
    candidatePanelApi.getNotes(candidateId)
      .then((d) => setNotes(d.notes))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    const content = noteText.trim();
    if (!content) return;
    setSaving(true);
    try {
      await candidatePanelApi.createNote(candidateId, { content });
      setNoteText('');
      load();
      showToast('Note added', 'success');
    } catch {
      showToast('Failed to add note', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(noteId: string) {
    const content = editText.trim();
    if (!content) return;
    try {
      await candidatePanelApi.updateNote(candidateId, noteId, content);
      setEditingId(null);
      load();
    } catch {
      showToast('Failed to update note', 'error');
    }
  }

  async function handleDelete(noteId: string) {
    try {
      await candidatePanelApi.deleteNote(candidateId, noteId);
      load();
      showToast('Note deleted', 'success');
    } catch {
      showToast('Failed to delete note', 'error');
    }
  }

  if (loading) {
    return (
      <Card padding="lg">
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add note */}
      <Card padding="lg">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full text-sm border border-[var(--color-border)] rounded-xl px-3 py-2.5 resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
        />
        <div className="flex justify-end mt-2">
          <Button
            variant="primary"
            size="sm"
            disabled={!noteText.trim() || saving}
            isLoading={saving}
            onClick={handleAdd}
          >
            <Send size={13} /> Add Note
          </Button>
        </div>
      </Card>

      {/* Notes list */}
      {notes.length === 0 ? (
        <Card padding="lg">
          <div className="flex flex-col items-center py-10 gap-3 text-[var(--color-text-muted)]">
            <MessageSquare size={24} />
            <p className="text-sm">No notes yet.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card key={note.id} padding="lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Avatar name={note.authorName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[var(--color-text-primary)]">{note.authorName}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">{fmtDateTime(note.createdAt)}</span>
                      {note.jobTitle && (
                        <span className="text-xs text-[var(--color-text-muted)]">· {note.jobTitle}</span>
                      )}
                    </div>
                    {editingId === note.id ? (
                      <div>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full text-sm border border-[var(--color-border)] rounded-xl px-3 py-2.5 resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <Button variant="primary" size="sm" onClick={() => handleUpdate(note.id)}>Save</Button>
                          <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{note.content}</p>
                    )}
                  </div>
                </div>
                {editingId !== note.id && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditingId(note.id); setEditText(note.content); }}
                      className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Emails Tab ───────────────────────────────────────────────────────────────

// EmailsTab is now CandidateEmails from @/components/candidates/CandidateEmails

// ─── Interviews Tab ───────────────────────────────────────────────────────────

const IV_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  scheduled:  { label: 'Scheduled',  variant: 'info' },
  completed:  { label: 'Completed',  variant: 'success' },
  cancelled:  { label: 'Cancelled',  variant: 'error' },
  'no-show':  { label: 'No Show',    variant: 'error' },
};

const IV_TYPE_LABEL: Record<string, string> = {
  phone: 'Phone', video: 'Video', 'on-site': 'On-Site', technical: 'Technical',
};

function InterviewsTab({ candidate, extraInterviews = [] }: { candidate: CandidateDetailDto; extraInterviews?: InterviewDto[] }) {
  const fromApplications = candidate.applications.flatMap((app) =>
    app.interviews.map((iv) => ({
      id: iv.id, type: iv.type, status: iv.status,
      scheduledAt: iv.scheduledAt, duration: iv.duration,
      rating: iv.rating ?? null, jobTitle: app.jobTitle, jobId: app.jobId,
      meetingLink: null as string | null,
    }))
  );

  // Newly-scheduled interviews (not yet in candidate.applications)
  const fromExtra = extraInterviews
    .filter((iv) => !fromApplications.some((a) => a.id === iv.id))
    .map((iv) => ({
      id: iv.id, type: iv.type, status: iv.status,
      scheduledAt: iv.scheduledAt, duration: iv.duration,
      rating: iv.feedback?.rating ?? null, jobTitle: iv.jobTitle, jobId: iv.jobId,
      meetingLink: iv.meetingLink,
    }));

  const allInterviews = [...fromExtra, ...fromApplications]
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  if (allInterviews.length === 0) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center py-12 gap-3 text-[var(--color-text-muted)]">
          <Calendar size={28} />
          <p className="text-sm">No interviews scheduled.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="divide-y divide-[var(--color-border)]">
        {allInterviews.map((iv) => {
          const statusCfg = IV_STATUS[iv.status] ?? { label: iv.status, variant: 'default' as BadgeVariant };
          return (
            <div key={iv.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {IV_TYPE_LABEL[iv.type] ?? iv.type} Interview
                  </span>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {fmtDateTime(iv.scheduledAt)} · {iv.duration} min
                </p>
                {iv.jobTitle && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{iv.jobTitle}</p>
                )}
                {iv.meetingLink && (
                  <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[var(--color-primary)] hover:underline mt-0.5 inline-block"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🎥 Join Meeting
                  </a>
                )}
                {iv.rating != null && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={10}
                        className={i < iv.rating! ? 'text-amber-400 fill-amber-400' : 'text-neutral-300 fill-neutral-300'}
                      />
                    ))}
                  </div>
                )}
              </div>
              <a
                href={`/jobs/${iv.jobId}`}
                className="text-xs text-[var(--color-primary)] hover:underline flex-shrink-0"
              >
                View job
              </a>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Feedback Tab ─────────────────────────────────────────────────────────────

const RECOMMENDATION_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  'strong-yes': { label: 'Strong Yes', variant: 'success' },
  'yes':        { label: 'Yes',        variant: 'success' },
  'no':         { label: 'No',         variant: 'error' },
  'strong-no':  { label: 'Strong No',  variant: 'error' },
  'hire':       { label: 'Hire',       variant: 'success' },
  'no-hire':    { label: 'No Hire',    variant: 'error' },
  'maybe':      { label: 'Maybe',      variant: 'warning' },
};

function FeedbackTab({ candidateId, onAddEvaluation }: { candidateId: string; onAddEvaluation?: () => void }) {
  const [feedback,    setFeedback]    = useState<CandidateFeedbackDto[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationDto[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      candidatePanelApi.getFeedback(candidateId).then((d) => { setHiddenCount(d.hiddenCount ?? 0); return d.feedback; }).catch(() => [] as CandidateFeedbackDto[]),
      evaluationsApi.getByCandidate(candidateId).then((d) => d.evaluations).catch(() => [] as EvaluationDto[]),
    ]).then(([fb, ev]) => {
      setFeedback(fb);
      setEvaluations(ev);
    }).finally(() => setLoading(false));
  }, [candidateId]);

  if (loading) {
    return (
      <Card padding="lg">
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      </Card>
    );
  }

  if (feedback.length === 0 && evaluations.length === 0) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center py-12 gap-3 text-[var(--color-text-muted)]">
          <Star size={28} />
          <p className="text-sm">No evaluations yet.</p>
          {onAddEvaluation && (
            <Button variant="primary" size="sm" onClick={onAddEvaluation}>
              <Plus size={13} /> Add Evaluation
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {onAddEvaluation && (
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={onAddEvaluation}>
            <Plus size={13} /> Add Evaluation
          </Button>
        </div>
      )}
      {/* Interview feedback */}
      {feedback.map((fb) => {
        const recCfg = fb.recommendation ? (RECOMMENDATION_CONFIG[fb.recommendation] ?? { label: fb.recommendation, variant: 'default' as BadgeVariant }) : null;
        return (
          <Card key={fb.id} padding="lg">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {IV_TYPE_LABEL[fb.interviewType] ?? fb.interviewType} Interview
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{fmtDateTime(fb.scheduledAt)}</p>
                {fb.jobTitle && (
                  <p className="text-xs text-[var(--color-text-muted)]">{fb.jobTitle}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {recCfg && <Badge variant={recCfg.variant}>{recCfg.label}</Badge>}
                {fb.rating != null && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={11}
                        className={i < fb.rating! ? 'text-amber-400 fill-amber-400' : 'text-neutral-300 fill-neutral-300'}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            {fb.feedback && (
              <p className="text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-lg px-3 py-2">
                {fb.feedback}
              </p>
            )}
          </Card>
        );
      })}

      {/* Scorecard evaluations */}
      {evaluations.map((ev) => {
        const recCfg = ev.overallRecommendation ? (RECOMMENDATION_CONFIG[ev.overallRecommendation] ?? { label: ev.overallRecommendation, variant: 'default' as BadgeVariant }) : null;
        return (
          <Card key={ev.id} padding="lg">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Scorecard{ev.scorecardName ? `: ${ev.scorecardName}` : ''}
                </p>
                {ev.stageName && (
                  <p className="text-xs text-[var(--color-text-muted)]">Stage: {ev.stageName}</p>
                )}
                <p className="text-xs text-[var(--color-text-muted)]">{ev.jobTitle} · {ev.submittedByName}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{fmtDateTime(ev.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {recCfg && <Badge variant={recCfg.variant}>{recCfg.label}</Badge>}
                <Badge variant="default">{ev.status}</Badge>
              </div>
            </div>
            {ev.responses.length > 0 && (
              <div className="mt-2 space-y-2">
                {ev.responses.map((r) => (
                  <div key={r.id} className="text-xs bg-[var(--color-surface)] rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-text-muted)]">{r.criterionName}</span>
                      <span className="font-medium text-[var(--color-text-primary)]">{r.responseValue}</span>
                    </div>
                    {r.responseNotes && (
                      <div className="mt-1.5 pl-2 border-l-2 border-[var(--color-border)]">
                        <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5">{r.notesLabel || 'Notes'}</p>
                        <p className="text-[var(--color-text-primary)] leading-relaxed">{r.responseNotes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {ev.notes && (
              <p className="mt-2 text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-lg px-3 py-2">
                {ev.notes}
              </p>
            )}
          </Card>
        );
      })}

      {hiddenCount > 0 && (
        <p className="text-sm text-gray-500 mt-2">
          {hiddenCount} other feedback {hiddenCount === 1 ? 'entry' : 'entries'} — not visible to your role
        </p>
      )}
    </div>
  );
}

// ─── Applications Tab ─────────────────────────────────────────────────────────

function ApplicationsTab({ candidate }: { candidate: CandidateDetailDto }) {
  if (candidate.applications.length === 0) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center py-12 gap-3 text-[var(--color-text-muted)]">
          <Briefcase size={28} />
          <p className="text-sm">Not assigned to any jobs yet.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {candidate.applications.map((app) => {
        const statusCfg = APP_STATUS[app.status] ?? { label: app.status, variant: 'default' as BadgeVariant };
        return (
          <Card key={app.id} padding="lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{app.jobTitle}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {app.jobDepartment} · {app.jobLocation}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                  {app.stage && (
                    <span className="text-xs text-[var(--color-text-muted)]">{app.stage}</span>
                  )}
                  <span className="text-xs text-[var(--color-text-muted)]">Applied {fmtDate(app.appliedAt)}</span>
                </div>
                {app.offer && (
                  <div className="mt-2">
                    <Badge variant={app.offer.status === 'accepted' ? 'success' : 'warning'}>
                      Offer {app.offer.status}
                    </Badge>
                  </div>
                )}
              </div>
              <a
                href={`/jobs/${app.jobId}`}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline flex items-center gap-1 flex-shrink-0 mt-0.5"
              >
                <ExternalLink size={11} /> View in Pipeline
              </a>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Audit Trail Tab ──────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function AuditTrailTab({ candidateId }: { candidateId: string }) {
  const [entries, setEntries] = useState<AuditLogEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditLogsApi.getCandidateLogs(candidateId)
      .then((d) => setEntries(d.items))
      .catch(() => {/* show empty */})
      .finally(() => setLoading(false));
  }, [candidateId]);

  if (loading) {
    return (
      <Card padding="lg">
        <div className="flex justify-center py-10">
          <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card padding="lg">
        <div className="flex flex-col items-center py-12 gap-3 text-[var(--color-text-muted)]">
          <Shield size={28} />
          <p className="text-sm">No audit entries yet.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="space-y-0">
        {entries.map((entry, idx) => (
          <div key={entry.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                <Shield size={13} className="text-[var(--color-text-muted)]" />
              </div>
              {idx < entries.length - 1 && (
                <div className="w-px flex-1 bg-[var(--color-border)] my-1" style={{ minHeight: 24 }} />
              )}
            </div>
            <div className="pb-5 flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{getActionLabel(entry.action)}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-[var(--color-text-muted)]">{relativeTime(entry.createdAt)}</p>
                {entry.actorEmail && (
                  <p className="text-xs text-[var(--color-text-muted)]">· {entry.actorEmail}</p>
                )}
                {entry.ipAddress && entry.ipAddress !== 'unknown' && (
                  <p className="text-xs text-[var(--color-text-muted)]">· {entry.ipAddress}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ candidate, canReadPII }: { candidate: CandidateDetailDto; canReadPII: boolean }) {
  return (
    <div className="space-y-4">
      {/* Skills */}
      {candidate.skills.length > 0 && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {candidate.skills.map((skill) => (
              <span
                key={skill}
                className="text-xs px-2.5 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)]"
              >
                {skill}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* CV Link */}
      {(candidate.cvUrl || !canReadPII) && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">CV / Resume</h3>
          {canReadPII && candidate.cvUrl ? (
            <a
              href={candidate.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline"
            >
              <FileText size={14} /> Download CV
            </a>
          ) : (
            <Tooltip content="Contact details are restricted to recruiters and managers">
              <span className="inline-flex items-center gap-2 text-sm text-gray-400 cursor-not-allowed select-none">
                <FileText size={14} /> Download CV <Lock size={14} />
              </span>
            </Tooltip>
          )}
        </Card>
      )}

      {/* Tags */}
      {candidate.tags.length > 0 && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {candidate.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 bg-violet-50 border border-violet-200 rounded-lg text-violet-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Nothing to show */}
      {candidate.skills.length === 0 && !candidate.cvUrl && candidate.tags.length === 0 && (
        <Card padding="lg">
          <div className="flex flex-col items-center py-10 gap-3 text-[var(--color-text-muted)]">
            <User size={24} />
            <p className="text-sm">No additional profile information.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Sidebar Cards ────────────────────────────────────────────────────────────

function MaskedPII() {
  return (
    <Tooltip content="Contact details are restricted to recruiters and managers">
      <span className="inline-flex items-center gap-1 text-gray-400 select-none">
        <span>••••••••</span>
        <Lock size={14} />
      </span>
    </Tooltip>
  );
}

function ContactCard({ candidate, canReadPII }: { candidate: CandidateDetailDto; canReadPII: boolean }) {
  return (
    <Card padding="lg">
      <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Contact</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2.5 text-sm truncate">
          <Mail size={13} className="flex-shrink-0 text-[var(--color-text-muted)]" />
          {canReadPII ? (
            <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline truncate">{candidate.email}</a>
          ) : <MaskedPII />}
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <Phone size={13} className="flex-shrink-0 text-[var(--color-text-muted)]" />
          {canReadPII ? (
            candidate.phone ? <a href={`tel:${candidate.phone}`} className="text-[var(--color-text-primary)] hover:text-blue-600">{candidate.phone}</a> : <span className="text-[var(--color-text-muted)]">—</span>
          ) : <MaskedPII />}
        </div>
        <div className="flex items-center gap-2.5 text-sm text-[var(--color-text-muted)]">
          <MapPin size={13} className="flex-shrink-0" />
          {canReadPII ? (candidate.location ?? '—') : <MaskedPII />}
        </div>
        <div className="flex items-center gap-2.5 text-sm">
          <Linkedin size={13} className="flex-shrink-0 text-[var(--color-text-muted)]" />
          {canReadPII ? (
            candidate.linkedInUrl ? <a href={candidate.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn Profile</a> : <span className="text-[var(--color-text-muted)]">—</span>
          ) : <MaskedPII />}
        </div>
      </div>
    </Card>
  );
}

function PipelineCard({ candidate }: { candidate: CandidateDetailDto }) {
  return (
    <Card padding="lg">
      <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
        In Job Pipelines
      </h3>
      {candidate.applications.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Not in any pipeline.</p>
      ) : (
        <div className="space-y-3">
          {candidate.applications.map((app) => {
            const statusCfg = APP_STATUS[app.status] ?? { label: app.status, variant: 'default' as BadgeVariant };
            return (
              <div key={app.id}>
                <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{app.jobTitle}</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                  <a
                    href={`/jobs/${app.jobId}`}
                    className="text-xs text-[var(--color-primary)] hover:underline flex-shrink-0"
                  >
                    View job →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function SourcingCard({ candidate }: { candidate: CandidateDetailDto }) {
  const sourceLabel = SOURCE_LABELS[candidate.source] ?? candidate.source;
  return (
    <Card padding="lg">
      <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Sourcing</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">Source</span>
          <Badge variant="default">{sourceLabel}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-muted)]">Added</span>
          <span className="text-xs text-[var(--color-text-primary)]">{fmtDate(candidate.createdAt)}</span>
        </div>
        {candidate.currentCompany && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">Company</span>
            <span className="text-xs text-[var(--color-text-primary)] truncate max-w-[120px]">{candidate.currentCompany}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Privacy & Consent Card ──────────────────────────────────────────────────

const LEGAL_BASIS_OPTIONS = [
  { value: 'LEGITIMATE_INTERESTS', label: 'Legitimate Interests' },
  { value: 'CONSENT', label: 'Consent' },
  { value: 'CONTRACT', label: 'Contractual Necessity' },
];

function PrivacyCard({ candidateId, candidateEmail }: { candidateId: string; candidateEmail: string }) {
  const { showToast } = useToast();

  // Remote state
  const [loading, setLoading] = useState(true);
  const [legalBasis, setLegalBasis] = useState<LegalBasis>('LEGITIMATE_INTERESTS');
  const [noticeSentAt, setNoticeSentAt] = useState<string | null>(null);
  const [noticeSentBy, setNoticeSentBy] = useState<string | null>(null);
  const [consentGivenAt, setConsentGivenAt] = useState('');
  const [consentScope, setConsentScope] = useState('');
  const [retentionExpiresAt, setRetentionExpiresAt] = useState('');
  const [retentionNote, setRetentionNote] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [consentDateError, setConsentDateError] = useState('');
  const [retentionDateError, setRetentionDateError] = useState('');

  // Fetch privacy data
  useEffect(() => {
    setLoading(true);
    candidatesApi.getPrivacy(candidateId)
      .then((p) => {
        setLegalBasis((p.legalBasis as LegalBasis) || 'LEGITIMATE_INTERESTS');
        setNoticeSentAt(p.privacyNoticeSentAt);
        setNoticeSentBy(p.privacyNoticeSentBy);
        setConsentGivenAt(p.consentGivenAt ? p.consentGivenAt.slice(0, 10) : '');
        setConsentScope(p.consentScope ?? '');
        setRetentionExpiresAt(p.retentionExpiresAt ? p.retentionExpiresAt.slice(0, 10) : '');
        setRetentionNote(p.retentionNote ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [candidateId]);

  // Client-side validation
  function validate(): boolean {
    let valid = true;
    setConsentDateError('');
    setRetentionDateError('');

    if (legalBasis === 'CONSENT' && !consentGivenAt) {
      setConsentDateError('Consent date is required');
      valid = false;
    }
    if (retentionExpiresAt && new Date(retentionExpiresAt) < new Date()) {
      setRetentionDateError('Retention date is in the past');
      valid = false;
    }
    return valid;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, string | undefined> = {
        legalBasis,
        retentionExpiresAt: retentionExpiresAt ? new Date(retentionExpiresAt).toISOString() : undefined,
        retentionNote: retentionNote || undefined,
      };
      if (legalBasis === 'CONSENT') {
        payload.consentGivenAt = consentGivenAt ? new Date(consentGivenAt).toISOString() : undefined;
        payload.consentScope = consentScope || undefined;
      }
      await candidatesApi.updatePrivacy(candidateId, payload);
      showToast('Privacy settings saved', 'success');
    } catch {
      showToast('Failed to save privacy settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendNotice() {
    setSending(true);
    try {
      const result = await candidatesApi.sendPrivacyNotice(candidateId);
      setNoticeSentAt(result.sentAt);
      setNoticeModalOpen(false);
      showToast('Privacy notice sent', 'success');
      // Refetch to get resolved sentBy name
      candidatesApi.getPrivacy(candidateId).then((p) => {
        setNoticeSentBy(p.privacyNoticeSentBy);
      }).catch(() => {});
    } catch {
      showToast('Failed to send privacy notice', 'error');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <Card padding="lg">
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Shield size={12} /> Privacy & Consent
        </h3>
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card padding="lg">
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Shield size={12} /> Privacy & Consent
        </h3>

        <div className="space-y-3">
          {/* Status row */}
          <div className="flex items-center gap-2 flex-wrap">
            {noticeSentAt ? (
              <>
                <Badge variant="success">Notice Sent</Badge>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Sent {fmtDate(noticeSentAt)}{noticeSentBy ? ` by ${noticeSentBy}` : ''}
                </span>
              </>
            ) : (
              <Badge variant="error">Notice Required</Badge>
            )}
          </div>

          {/* Legal basis */}
          <Select
            label="Legal basis"
            options={LEGAL_BASIS_OPTIONS}
            value={legalBasis}
            onChange={(v) => setLegalBasis(v as LegalBasis)}
          />

          {/* Consent fields (conditional) */}
          {legalBasis === 'CONSENT' && (
            <div className="space-y-3">
              <Input
                type="date"
                label="Consent given"
                value={consentGivenAt}
                onChange={(e) => { setConsentGivenAt(e.target.value); setConsentDateError(''); }}
                error={consentDateError || undefined}
              />
              <Input
                label="Consent scope"
                value={consentScope}
                onChange={(e) => setConsentScope(e.target.value)}
                placeholder="e.g. Talent pool retention 24 months"
                hint="e.g. Talent pool retention 24 months"
              />
            </div>
          )}

          {/* Retention fields */}
          <Input
            type="date"
            label="Retention expires"
            value={retentionExpiresAt}
            onChange={(e) => { setRetentionExpiresAt(e.target.value); setRetentionDateError(''); }}
            error={retentionDateError || undefined}
          />
          <Input
            label="Retention note"
            value={retentionNote}
            onChange={(e) => setRetentionNote(e.target.value)}
            placeholder="Optional note"
            maxLength={200}
          />

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="primary" size="sm" isLoading={saving} onClick={handleSave}>
              Save Privacy Settings
            </Button>
            {candidateEmail ? (
              <Button variant="secondary" size="sm" onClick={() => setNoticeModalOpen(true)}>
                Send Privacy Notice
              </Button>
            ) : (
              <Tooltip content="Candidate has no email address on file">
                <Button variant="secondary" size="sm" disabled>
                  Send Privacy Notice
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </Card>

      {/* Send Privacy Notice Modal */}
      <Modal
        isOpen={noticeModalOpen}
        onClose={() => setNoticeModalOpen(false)}
        title="Send Privacy Notice"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setNoticeModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" isLoading={sending} onClick={handleSendNotice}>
              Confirm & Send
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-primary)] leading-relaxed">
            <p className="font-semibold mb-2">Privacy Notice Preview</p>
            <p className="mb-2">This notice informs the candidate about:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Who is the data controller</li>
              <li>What personal data is collected (name, contact, CV, employment history, interview notes)</li>
              <li>Legal basis for processing (Legitimate Interests, GDPR Art. 6(1)(f))</li>
              <li>Retention periods (active: process duration, unsuccessful: 12 months, talent pool: 24 months)</li>
              <li>Data recipients (recruiters and hiring team)</li>
              <li>Data subject rights (access, erasure, rectification, portability, objection)</li>
              <li>Supervisory authority (Autoriteit Persoonsgegevens)</li>
              <li>Link to full privacy policy</li>
            </ul>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Sending records the notice timestamp. Wire your email provider to deliver this.
          </p>
        </div>
      </Modal>
    </>
  );
}

// ─── Follow Up Dropdown ───────────────────────────────────────────────────────

function FollowUpDropdown({ candidateId, onChanged }: { candidateId: string; onChanged: () => void }) {
  const { showToast } = useToast();
  const [open, setOpen]           = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpDto[]>([]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    followUpsApi.getByCandidateId(candidateId)
      .then((d) => setFollowUps(d.followUps))
      .catch(() => {});
  }, [candidateId]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const nextPending = followUps.find((f) => !f.isCompleted);

  async function schedule(date: Date) {
    try {
      await followUpsApi.create({ candidateId, followUpDate: date.toISOString() });
      showToast(`Follow-up set for ${fmtDate(date.toISOString())}`, 'success');
      const d = await followUpsApi.getByCandidateId(candidateId);
      setFollowUps(d.followUps);
      onChanged();
    } catch {
      showToast('Failed to set follow-up', 'error');
    }
    setOpen(false);
  }

  async function markDone(id: string) {
    try {
      await followUpsApi.update(id, { isCompleted: true });
      const d = await followUpsApi.getByCandidateId(candidateId);
      setFollowUps(d.followUps);
      onChanged();
    } catch {
      showToast('Failed to update follow-up', 'error');
    }
  }

  function inMonths(n: number) {
    const d = new Date();
    d.setMonth(d.getMonth() + n);
    schedule(d);
  }

  return (
    <>
      <div ref={ref} className="relative">
        <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
          <Clock size={13} />
          {nextPending ? `Follow Up · ${fmtDate(nextPending.followUpDate)}` : 'Follow Up'}
          <ChevronDown size={11} />
        </Button>

        {open && (
          <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-20 py-1.5">
            {nextPending && (
              <>
                <p className="px-3.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Pending</p>
                <button
                  onClick={() => { markDone(nextPending.id); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
                >
                  <Check size={13} className="text-green-500" />
                  Mark done ({fmtDate(nextPending.followUpDate)})
                </button>
                <div className="border-t border-[var(--color-border)] my-1" />
              </>
            )}
            <p className="px-3.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              {nextPending ? 'Reschedule' : 'Schedule'}
            </p>
            <button onClick={() => inMonths(3)} className="w-full text-left px-3.5 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]">
              In 3 months
            </button>
            <button onClick={() => inMonths(6)} className="w-full text-left px-3.5 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]">
              In 6 months
            </button>
            <div className="border-t border-[var(--color-border)] my-1" />
            <button
              onClick={() => { setCustomOpen(true); setOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
            >
              Custom date…
            </button>
          </div>
        )}
      </div>

      {customOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCustomOpen(false)} />
          <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl p-6 w-80">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Set Follow-up Date</h3>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 mb-4"
            />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setCustomOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                disabled={!customDate}
                onClick={() => { if (customDate) { schedule(new Date(customDate + 'T12:00:00')); setCustomOpen(false); } }}
              >
                Set Date
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Email Modal ──────────────────────────────────────────────────────────────

function EmailModal({ candidate, onClose }: { candidate: CandidateDetailDto; onClose: () => void }) {
  const { showToast } = useToast();
  const [to, setTo]         = useState(candidate.email);
  const [subject, setSubject] = useState('');
  const [body, setBody]     = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      showToast('Subject and body are required', 'error');
      return;
    }
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      showToast(`Email sent to ${to}`, 'success');
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">New Email</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">To</label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Write your email…"
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={sending} onClick={handleSend}>
            <Send size={13} /> Send
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── More Dropdown ────────────────────────────────────────────────────────────

function MoreDropdown({ onScheduleInterview, onSubmitFeedback, onDeleteProfile, onDoNotContact }: {
  onScheduleInterview: () => void;
  onSubmitFeedback: () => void;
  onDeleteProfile: () => void;
  onDoNotContact: () => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function cs(label: string) {
    showToast(`${label} — coming soon`, 'info');
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
        <MoreHorizontal size={14} />
        More
        <ChevronDown size={11} />
      </Button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-52 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-20 py-1.5 max-h-[380px] overflow-y-auto">
          {[
            { label: 'Enroll in Sequence', icon: RefreshCw, action: () => cs('Enroll in Sequence') },
            { label: 'Schedule Interview',  icon: Calendar,  action: () => { setOpen(false); onScheduleInterview(); } },
            { label: 'Submit Feedback',     icon: MessageSquare, action: () => { setOpen(false); onSubmitFeedback(); } },
          ].map((item) => (
            <button key={item.label} onClick={item.action}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
            >
              <item.icon size={13} className="text-[var(--color-text-muted)]" />
              {item.label}
            </button>
          ))}

          <div className="border-t border-[var(--color-border)] my-1" />

          {[
            { label: 'Consider for Job',  icon: Briefcase,   action: () => cs('Consider for Job') },
            { label: 'Add to Project',    icon: FolderOpen,  action: () => cs('Add to Project') },
            { label: 'Find Email',        icon: Search,      action: () => cs('Find Email') },
            { label: 'Merge Profiles',    icon: GitMerge,    action: () => cs('Merge Profiles') },
            { label: 'Add Referral',      icon: UserPlus,    action: () => cs('Add Referral') },
          ].map((item) => (
            <button key={item.label} onClick={item.action}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
            >
              <item.icon size={13} className="text-[var(--color-text-muted)]" />
              {item.label}
            </button>
          ))}

          <div className="border-t border-[var(--color-border)] my-1" />

          <button onClick={() => { setOpen(false); onDoNotContact(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <UserX size={13} /> Do Not Contact
          </button>
          <button onClick={() => { setOpen(false); onDeleteProfile(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} /> Delete Profile
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Do Not Contact Modal ─────────────────────────────────────────────────────

const DNC_REASONS = [
  { value: 'candidate_requested', label: 'Candidate requested' },
  { value: 'unsubscribed',        label: 'Unsubscribed' },
  { value: 'gdpr_request',        label: 'GDPR request' },
  { value: 'other',               label: 'Other' },
];

function DoNotContactModal({ candidateId, candidateName, onClose, onConfirmed }: {
  candidateId: string;
  candidateName: string;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const { showToast } = useToast();
  const [reason, setReason] = useState('candidate_requested');
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await candidatesApi.setDoNotContact(candidateId, { doNotContact: true, reason, note: note.trim() || undefined });
      showToast(`${candidateName} marked as Do Not Contact`, 'success');
      onConfirmed();
      onClose();
    } catch {
      showToast('Failed to update Do Not Contact status', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-red-600">Mark as Do Not Contact</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-800">
              This will block all emails to {candidateName} and remove them from all active sequences.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none"
            >
              {DNC_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 resize-none focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={saving} onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 border-red-600"
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteProfileModal({ candidateId, candidateName, onClose, onDeleted }: {
  candidateId: string;
  candidateName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await candidatesApi.deleteCandidate(candidateId, 'soft');
      showToast(`${candidateName} removed from active pipeline`, 'success');
      onDeleted();
    } catch {
      showToast('Failed to delete profile', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Delete Profile</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-5">
          This candidate will be removed from your active pipeline. Their data is retained
          for compliance purposes and can be permanently deleted from the GDPR compliance settings.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={deleting} onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 border-red-600"
          >
            <Trash2 size={13} /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Reject Modal ────────────────────────────────────────────────────────────

function RejectCandidateModal({ applicationId, candidateName, fromJobTitle, onClose, onRejected }: {
  applicationId: string;
  candidateName: string;
  fromJobTitle: string;
  onClose: () => void;
  onRejected: () => void;
}) {
  const { showToast } = useToast();
  const [reasons, setReasons] = useState<RejectionReasonDto[]>([]);
  const [reasonsLoading, setReasonsLoading] = useState(true);
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [customReasonLabel, setCustomReasonLabel] = useState('');
  const [note, setNote] = useState('');
  const [selectError, setSelectError] = useState('');
  const [customReasonError, setCustomReasonError] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    rejectionReasonsApi.fetchAll()
      .then((data) => {
        setReasons(data);
        if (data.length > 0) setSelectedReasonId(data[0].id);
      })
      .catch(() => showToast('Failed to load rejection reasons', 'error'))
      .finally(() => setReasonsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedReason = reasons.find((r) => r.id === selectedReasonId);
  const isOtherSelected = selectedReasonId === 'other';
  const resolvedReasonLabel = isOtherSelected
    ? customReasonLabel.trim()
    : selectedReason?.label ?? '';

  async function handleConfirm() {
    if (reasons.length > 0 && !selectedReasonId) {
      setSelectError('Please select a rejection reason');
      return;
    }
    if (isOtherSelected && !customReasonLabel.trim()) {
      setCustomReasonError('Please enter a rejection reason');
      return;
    }
    if (reasons.length === 0 && !customReasonLabel.trim()) {
      setCustomReasonError('Please enter a rejection reason');
      return;
    }
    if (resolvedReasonLabel.length > 100) {
      setCustomReasonError('Reason must be 100 characters or less');
      return;
    }
    setIsRejecting(true);
    try {
      await applicationsApi.rejectApplication(applicationId, {
        reasonId: !isOtherSelected && selectedReasonId ? selectedReasonId : undefined,
        reasonLabel: reasons.length === 0 ? customReasonLabel.trim() : resolvedReasonLabel,
        note: note.trim() || undefined,
      });
      showToast(`${candidateName} rejected`, 'success');
      onRejected();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        onClose();
        showToast('This candidate has already been rejected', 'error');
      } else if (err instanceof ApiError && err.status === 422) {
        setSelectError('The selected reason is no longer active — please refresh and try again');
      } else {
        showToast('Failed to reject candidate — please try again', 'error');
      }
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-red-600">Reject Candidate</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Rejecting {candidateName}{fromJobTitle ? ` for ${fromJobTitle}` : ''}
            </p>
          </div>
          <button onClick={onClose} disabled={isRejecting} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Reason dropdown */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Rejection reason *</label>
            {reasonsLoading ? (
              <select disabled className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-muted)]">
                <option>Loading reasons...</option>
              </select>
            ) : reasons.length === 0 ? (
              <Input
                label=""
                value={customReasonLabel}
                onChange={(e) => { setCustomReasonLabel(e.target.value); setCustomReasonError(''); }}
                placeholder="Enter rejection reason"
                error={customReasonError}
                hint="No reasons configured in settings — type one manually"
                maxLength={100}
              />
            ) : (
              <>
                <select
                  value={selectedReasonId}
                  onChange={(e) => { setSelectedReasonId(e.target.value); setSelectError(''); }}
                  aria-label="Rejection reason"
                  className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none"
                >
                  {reasons.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  <option value="other">Other (specify below)</option>
                </select>
                {selectError && <p className="text-xs text-red-600 mt-1">{selectError}</p>}
                {selectedReason?.description && !isOtherSelected && (
                  <p className="text-xs text-gray-500 mt-1">{selectedReason.description}</p>
                )}
              </>
            )}
          </div>

          {/* Custom reason input when Other selected */}
          {isOtherSelected && reasons.length > 0 && (
            <Input
              label="Specify reason *"
              value={customReasonLabel}
              onChange={(e) => { setCustomReasonLabel(e.target.value); setCustomReasonError(''); }}
              error={customReasonError}
              placeholder="Enter rejection reason"
              maxLength={100}
            />
          )}

          {/* Internal note */}
          <div>
            <Input
              label="Internal note (optional)"
              hint="Not shared with the candidate"
              multiline
              rows={3}
              value={note}
              onChange={(e) => setNote((e.target as unknown as HTMLTextAreaElement).value)}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{note.length}/500</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isRejecting}>Cancel</Button>
          <Button variant="danger" size="sm" isLoading={isRejecting} disabled={reasonsLoading} onClick={handleConfirm}>
            Confirm Rejection
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CandidateProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromJobId    = searchParams.get('fromJob');
  const fromJobTitle = searchParams.get('fromJobTitle') ?? '';
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  const canReadPII = !['INTERVIEWER'].includes(authUser?.role ?? '');
  const canManagePipeline = authUser?.role === 'ADMIN' || authUser?.role === 'HR';

  const [candidate, setCandidate]   = useState<CandidateDetailDto | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [notFound, setNotFound]     = useState(false);
  const [activeTab, setActiveTab]   = useState<Tab>('feed');

  // Modals
  const [emailOpen,              setEmailOpen]              = useState(false);
  const [dncOpen,                setDncOpen]                = useState(false);
  const [deleteOpen,             setDeleteOpen]             = useState(false);
  const [scheduleInterviewOpen,  setScheduleInterviewOpen]  = useState(false);
  const [scorecardOpen,          setScorecardOpen]          = useState(false);
  const [showRejectModal,        setShowRejectModal]        = useState(false);

  // Extra interviews added this session (before page refresh)
  const [extraInterviews, setExtraInterviews] = useState<InterviewDto[]>([]);

  // Feed / feedback refresh counters
  const [feedKey,          setFeedKey]         = useState(0);
  const [feedbackRefreshKey, setFeedbackRefreshKey] = useState(0);

  useEffect(() => {
    candidatesApi.getCandidate(id)
      .then((d) => setCandidate(d.candidate))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <PageSkeleton />;

  if (notFound || !candidate) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push('/candidates')}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Back to Candidates
        </button>
        <div className="flex flex-col items-center py-20 gap-4 text-[var(--color-text-muted)]">
          <User size={40} />
          <div className="text-center">
            <p className="text-base font-semibold text-[var(--color-text-primary)]">Candidate not found</p>
            <p className="text-sm mt-1">This candidate may have been deleted or you don&apos;t have access.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => router.push('/candidates')}>
            <ArrowLeft size={13} /> Back to Candidates
          </Button>
        </div>
      </div>
    );
  }

  const fullName    = `${candidate.firstName} ${candidate.lastName}`;
  const latestApp   = candidate.applications[0];
  const latestStatusCfg = latestApp ? (APP_STATUS[latestApp.status] ?? null) : null;
  const totalInterviews = candidate.applications.reduce((s, a) => s + a.interviews.length, 0) + extraInterviews.length;
  const noteCount = 0; // fetched in NotesTab

  // Best jobId to use for scorecard evaluation modal
  const scorecardJobId = fromJobId ?? latestApp?.jobId ?? '';

  // Resolve applicationId: prefer the application matching fromJob, otherwise most recent non-rejected
  const currentApplication = fromJobId
    ? candidate.applications.find((a) => a.jobId === fromJobId)
    : candidate.applications.find((a) => a.status !== 'rejected');
  const currentApplicationId = currentApplication?.id;
  const currentRejection = candidate.applications.find((a) => a.rejection)?.rejection;
  // Show reject button when there's an active application, not already rejected/hired, and user is ADMIN/HR
  const canReject = currentApplicationId
    && !currentApplication?.rejection
    && currentApplication?.status !== 'rejected'
    && latestApp?.status !== 'hired'
    && canManagePipeline;

  function handleDeleted() {
    router.push('/candidates');
  }

  function handleDncConfirmed() {
    candidatesApi.getCandidate(id)
      .then((d) => setCandidate(d.candidate))
      .catch(() => {});
    setFeedKey((k) => k + 1);
  }

  return (
    <div className="p-8">

      {/* ── Back ── */}
      <button
        onClick={() => fromJobId ? router.push(`/jobs/${fromJobId}`) : router.push('/candidates')}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        {fromJobId ? `Back to ${fromJobTitle || 'Job'}` : 'Back to Candidates'}
      </button>

      {/* ── Do Not Contact Banner ── */}
      {candidate.doNotContact && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-red-600 text-white rounded-xl">
          <UserX size={16} className="flex-shrink-0" />
          <span className="text-sm font-semibold">
            DO NOT CONTACT
            {candidate.doNotContactReason && ` — ${DNC_REASONS.find((r) => r.value === candidate.doNotContactReason)?.label ?? candidate.doNotContactReason}`}
          </span>
        </div>
      )}

      {/* ── Header Card ── */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-start gap-5">
          <Avatar name={fullName} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              {/* Name / title / badges */}
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{fullName}</h1>
                {latestApp && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{latestApp.jobTitle}</p>
                )}
                {latestStatusCfg && (
                  <Badge variant={latestStatusCfg.variant} className="mt-2">{latestStatusCfg.label}</Badge>
                )}
                {candidate.retentionStatus === 'EXPIRING_SOON' && (
                  <Badge variant="warning" className="mt-2 ml-1">{getRetentionLabelFe(candidate)}</Badge>
                )}
                {candidate.retentionStatus === 'EXPIRED' && (
                  <Badge variant="error" className="mt-2 ml-1">{getRetentionLabelFe(candidate)}</Badge>
                )}
                {currentRejection && (
                  <div className="text-sm text-gray-500 mt-1">
                    <span>Rejected: <strong>{currentRejection.reasonLabel}</strong></span>
                    {currentRejection.note && <span> · {currentRejection.note}</span>}
                    <span> · {fmtDate(currentRejection.rejectedAt)}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {canReject && (
                  <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)}>
                    <XCircle size={13} className="mr-1" /> Reject
                  </Button>
                )}
                {canManagePipeline && <FollowUpDropdown candidateId={id} onChanged={() => {}} />}

                {canManagePipeline && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={candidate.doNotContact}
                    onClick={() => setEmailOpen(true)}
                  >
                    <Mail size={13} /> Email
                  </Button>
                )}

                {/* MANAGER/INTERVIEWER: show schedule & feedback but not admin actions */}
                {!canManagePipeline && (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setScheduleInterviewOpen(true)}>
                      <Calendar size={13} /> Schedule Interview
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => { if (scorecardJobId) setScorecardOpen(true); else showToast('No job linked to this candidate', 'error'); }}>
                      <Star size={13} /> Submit Feedback
                    </Button>
                  </div>
                )}

                {canManagePipeline && (
                  <MoreDropdown
                    onScheduleInterview={() => setScheduleInterviewOpen(true)}
                    onSubmitFeedback={() => { if (scorecardJobId) setScorecardOpen(true); else showToast('No job linked to this candidate', 'error'); }}
                    onDeleteProfile={() => setDeleteOpen(true)}
                    onDoNotContact={() => setDncOpen(true)}
                  />
                )}
              </div>
            </div>

            {/* Contact row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5">
                <Mail size={13} /> {canReadPII ? <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline">{candidate.email}</a> : <MaskedPII />}
              </span>
              {(canReadPII ? candidate.phone : true) && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} /> {canReadPII ? candidate.phone : <MaskedPII />}
                </span>
              )}
              {(canReadPII ? candidate.location : true) && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> {canReadPII ? candidate.location : <MaskedPII />}
                </span>
              )}
              {(canReadPII ? candidate.linkedInUrl : true) && (
                <span className="flex items-center gap-1.5">
                  <Linkedin size={13} /> {canReadPII ? <a href={candidate.linkedInUrl!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn</a> : <MaskedPII />}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> Added {fmtDate(candidate.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Two-column layout ── */}
      <div className="flex gap-6 items-start">

        {/* ── Left column: tabs + content ── */}
        <div className="flex-1 min-w-0">

          {/* Tab bar */}
          <div className="flex gap-1 mb-5 border-b border-[var(--color-border)] overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {tab.label}
                {tab.id === 'applications' && candidate.applications.length > 0 && (
                  <span className="text-[10px] bg-[var(--color-surface)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-full">
                    {candidate.applications.length}
                  </span>
                )}
                {tab.id === 'interviews' && totalInterviews > 0 && (
                  <span className="text-[10px] bg-[var(--color-surface)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-full">
                    {totalInterviews}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'feed'         && <FeedTab key={feedKey} candidateId={id} />}
          {activeTab === 'notes'        && <NotesTab candidateId={id} />}
          {activeTab === 'comments'     && <CandidateComments candidateId={id} applicationId={currentApplicationId} currentUserRole={authUser?.role ?? ''} currentUserId={authUser?.id ?? ''} />}
          {activeTab === 'emails'       && <CandidateEmails candidateId={id} candidateEmail={candidate.email} currentUserRole={authUser?.role ?? ''} />}
          {activeTab === 'interviews'   && <InterviewsTab candidate={candidate} extraInterviews={extraInterviews} />}
          {activeTab === 'feedback'     && <FeedbackTab key={feedbackRefreshKey} candidateId={id} onAddEvaluation={scorecardJobId ? () => setScorecardOpen(true) : undefined} />}
          {activeTab === 'applications' && <ApplicationsTab candidate={candidate} />}
          {activeTab === 'overview'     && <OverviewTab candidate={candidate} canReadPII={canReadPII} />}
          {activeTab === 'timeline'     && <CandidateTimeline candidateId={id} applicationId={currentApplicationId} />}
          {activeTab === 'audit'        && <AuditTrailTab candidateId={id} />}
        </div>

        {/* ── Right column: sidebar ── */}
        <div className="w-72 flex-shrink-0 space-y-4">
          <ContactCard candidate={candidate} canReadPII={canReadPII} />
          <PipelineCard candidate={candidate} />
          <SourcingCard candidate={candidate} />
          <PrivacyCard candidateId={id} candidateEmail={candidate.email} />
        </div>
      </div>

      {/* ── Modals ── */}
      {emailOpen && (
        <EmailModal candidate={candidate} onClose={() => setEmailOpen(false)} />
      )}

      {dncOpen && (
        <DoNotContactModal
          candidateId={id}
          candidateName={fullName}
          onClose={() => setDncOpen(false)}
          onConfirmed={handleDncConfirmed}
        />
      )}

      {deleteOpen && (
        <DeleteProfileModal
          candidateId={id}
          candidateName={fullName}
          onClose={() => setDeleteOpen(false)}
          onDeleted={handleDeleted}
        />
      )}

      {scheduleInterviewOpen && (
        <ScheduleInterviewModal
          isOpen={scheduleInterviewOpen}
          onClose={() => setScheduleInterviewOpen(false)}
          onSuccess={(iv) => {
            setExtraInterviews((prev) => [iv, ...prev]);
            setScheduleInterviewOpen(false);
            setActiveTab('interviews');
          }}
          candidateId={id}
          candidateName={fullName}
          preselectedJobId={fromJobId ?? undefined}
          preselectedJobTitle={fromJobTitle || undefined}
        />
      )}

      {scorecardOpen && scorecardJobId && (
        <ScorecardModal
          candidateId={id}
          candidateName={fullName}
          jobId={scorecardJobId}
          onClose={() => setScorecardOpen(false)}
          onSubmitted={() => {
            setScorecardOpen(false);
            setFeedbackRefreshKey((k) => k + 1);
            setActiveTab('feedback');
          }}
        />
      )}

      {showRejectModal && currentApplicationId && (
        <RejectCandidateModal
          applicationId={currentApplicationId}
          candidateName={fullName}
          fromJobTitle={fromJobTitle}
          onClose={() => setShowRejectModal(false)}
          onRejected={() => {
            candidatesApi.getCandidate(id).then((d) => setCandidate(d.candidate)).catch(() => {});
            setFeedKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
