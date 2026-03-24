'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Plus, Video, Phone, MapPin, Monitor, Code2,
  ChevronLeft, ChevronRight, Clock, User, X, Check,
  Star, AlertCircle, CheckCircle2, XCircle, MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import {
  interviewsApi, jobsApi, candidatesApi,
  type InterviewDto, type InterviewType, type Recommendation,
  type InterviewerDto,
} from '@/lib/api';
import type { BadgeVariant } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

type ViewMode = 'week' | 'list';

const INTERVIEW_TYPES: InterviewType[] = ['Phone', 'Video', 'On-site', 'Technical'];
const DURATIONS = [15, 30, 45, 60, 90, 120];
const HOUR_START = 8;
const HOUR_END   = 20;
const ROW_H      = 56; // px per hour

const TYPE_ICON: Record<InterviewType, React.ReactNode> = {
  Phone:     <Phone     size={12} />,
  Video:     <Video     size={12} />,
  'On-site': <MapPin    size={12} />,
  Technical: <Code2     size={12} />,
};

const TYPE_COLOR: Record<InterviewType, string> = {
  Phone:     'bg-blue-100   text-blue-800   border-blue-200',
  Video:     'bg-purple-100 text-purple-800 border-purple-200',
  'On-site': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Technical: 'bg-amber-100  text-amber-800  border-amber-200',
};

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  scheduled:  { label: 'Scheduled',  variant: 'info'    },
  completed:  { label: 'Completed',  variant: 'success' },
  cancelled:  { label: 'Cancelled',  variant: 'error'   },
  'no-show':  { label: 'No-show',    variant: 'warning' },
};

const TEAM_MEMBERS: InterviewerDto[] = [
  { id: 'tm-1', name: 'Alex Johnson',   role: 'HR Lead'           },
  { id: 'tm-2', name: 'Sarah Chen',     role: 'Recruiter'         },
  { id: 'tm-3', name: 'Marcus Williams',role: 'Engineering Lead'  },
  { id: 'tm-4', name: 'Priya Patel',    role: 'Product Lead'      },
  { id: 'tm-5', name: 'James Okafor',   role: 'Recruiter'         },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function interviewPosition(scheduledAt: string, duration: number): { top: number; height: number } {
  const dt = new Date(scheduledAt);
  const hour = dt.getHours();
  const min  = dt.getMinutes();
  const top  = ((hour - HOUR_START) + min / 60) * ROW_H;
  const height = Math.max((duration / 60) * ROW_H, 24);
  return { top, height };
}

// ─── Confirmation modal ────────────────────────────────────────────────────────

function ConfirmModal({ open, title, description, onConfirm, onCancel, loading }: {
  open: boolean; title: string; description: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>Keep</Button>
          <Button variant="danger" size="sm" isLoading={loading} onClick={onConfirm}>Cancel Interview</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail / reschedule modal ────────────────────────────────────────────────

function DetailModal({ interview, onClose, onCancelled, onFeedbackSubmitted }: {
  interview: InterviewDto;
  onClose: () => void;
  onCancelled: (id: string) => void;
  onFeedbackSubmitted: (iv: InterviewDto) => void;
}) {
  const { showToast } = useToast();
  const [confirmCancel, setConfirmCancel]   = useState(false);
  const [cancelling, setCancelling]         = useState(false);
  const [showFeedback, setShowFeedback]     = useState(false);
  const [fbForm, setFbForm]                 = useState({ rating: 3, recommendation: 'hire' as Recommendation, notes: '' });
  const [fbSaving, setFbSaving]             = useState(false);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [newDateTime, setNewDateTime]       = useState(interview.scheduledAt.slice(0, 16));
  const [rescheduling, setRescheduling]     = useState(false);

  async function handleCancel() {
    setCancelling(true);
    try {
      await interviewsApi.cancel(interview.id);
      onCancelled(interview.id);
      showToast('Interview cancelled');
      onClose();
    } catch { showToast('Failed to cancel', 'error'); }
    finally { setCancelling(false); }
  }

  async function handleReschedule() {
    if (!newDateTime) return;
    setRescheduling(true);
    try {
      await interviewsApi.update(interview.id, { scheduledAt: new Date(newDateTime).toISOString() });
      showToast('Interview rescheduled');
      onClose();
    } catch { showToast('Failed to reschedule', 'error'); }
    finally { setRescheduling(false); }
  }

  async function handleFeedback() {
    setFbSaving(true);
    try {
      const { interview: updated } = await interviewsApi.submitFeedback(interview.id, fbForm);
      onFeedbackSubmitted(updated);
      showToast('Feedback submitted');
      onClose();
    } catch { showToast('Failed to submit feedback', 'error'); }
    finally { setFbSaving(false); }
  }

  const canCancel   = interview.status === 'scheduled';
  const canFeedback = (interview.status === 'scheduled' || interview.status === 'completed') && !interview.feedback;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-[var(--color-border)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLOR[interview.type]}`}>
                {TYPE_ICON[interview.type]} {interview.type}
              </span>
              <Badge variant={STATUS_CONFIG[interview.status]?.variant ?? 'default'}>
                {STATUS_CONFIG[interview.status]?.label ?? interview.status}
              </Badge>
            </div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{interview.candidateName}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{interview.jobTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-surface)] rounded-lg">
            <X size={15} className="text-[var(--color-text-muted)]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--color-surface)] rounded-xl p-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Date & Time</p>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{fmtDateLong(interview.scheduledAt)}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{fmtTime(interview.scheduledAt)}</p>
            </div>
            <div className="bg-[var(--color-surface)] rounded-xl p-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Duration</p>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{interview.duration} min</p>
            </div>
          </div>

          {/* Location / link */}
          {(interview.meetingLink || interview.location) && (
            <div className="bg-[var(--color-surface)] rounded-xl p-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">{interview.meetingLink ? 'Meeting Link' : 'Location'}</p>
              {interview.meetingLink
                ? <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-primary)] underline break-all">{interview.meetingLink}</a>
                : <p className="text-sm text-[var(--color-text-primary)]">{interview.location}</p>}
            </div>
          )}

          {/* Interviewers */}
          {interview.interviewers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Interviewers</p>
              <div className="flex flex-wrap gap-2">
                {interview.interviewers.map((iv) => (
                  <div key={iv.id} className="flex items-center gap-1.5 bg-[var(--color-surface)] px-2.5 py-1.5 rounded-lg">
                    <Avatar name={iv.name} size="sm" />
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text-primary)] leading-tight">{iv.name}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] leading-tight">{iv.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {interview.notes && (
            <div className="bg-[var(--color-surface)] rounded-xl p-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Notes</p>
              <p className="text-sm text-[var(--color-text-primary)]">{interview.notes}</p>
            </div>
          )}

          {/* Existing feedback */}
          {interview.feedback && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-emerald-800">Feedback Submitted</p>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} size={12} className={s <= interview.feedback!.rating ? 'text-amber-500 fill-amber-500' : 'text-neutral-300'} />
                  ))}
                </div>
              </div>
              <p className="text-xs font-medium text-emerald-700 capitalize mb-1">Recommendation: {interview.feedback.recommendation.replace('-', ' ')}</p>
              {interview.feedback.notes && <p className="text-sm text-emerald-800">{interview.feedback.notes}</p>}
            </div>
          )}

          {/* Reschedule inline */}
          {canCancel && rescheduleMode && (
            <div className="border border-[var(--color-border)] rounded-xl p-4">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Reschedule</p>
              <input
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] mb-3"
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" isLoading={rescheduling} onClick={handleReschedule}>Confirm</Button>
                <Button variant="secondary" size="sm" onClick={() => setRescheduleMode(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Feedback form */}
          {canFeedback && showFeedback && (
            <div className="border border-[var(--color-border)] rounded-xl p-4">
              <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Submit Feedback</p>
              <div className="mb-3">
                <p className="text-xs text-[var(--color-text-muted)] mb-1.5">Rating</p>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <button key={s} type="button" onClick={() => setFbForm((p) => ({ ...p, rating: s }))}>
                      <Star size={20} className={s <= fbForm.rating ? 'text-amber-500 fill-amber-500' : 'text-neutral-200 hover:text-amber-300'} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <p className="text-xs text-[var(--color-text-muted)] mb-1.5">Recommendation</p>
                <div className="flex gap-2">
                  {(['hire','maybe','no-hire'] as Recommendation[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFbForm((p) => ({ ...p, recommendation: r }))}
                      className={[
                        'flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                        fbForm.recommendation === r
                          ? r === 'hire' ? 'bg-emerald-600 text-white border-emerald-600' : r === 'no-hire' ? 'bg-red-600 text-white border-red-600' : 'bg-amber-500 text-white border-amber-500'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]',
                      ].join(' ')}
                    >
                      {r === 'hire' ? 'Hire' : r === 'no-hire' ? 'No Hire' : 'Maybe'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <p className="text-xs text-[var(--color-text-muted)] mb-1.5">Notes</p>
                <textarea
                  value={fbForm.notes}
                  onChange={(e) => setFbForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  placeholder="Share your thoughts on this candidate..."
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" isLoading={fbSaving} onClick={handleFeedback}>Submit Feedback</Button>
                <Button variant="secondary" size="sm" onClick={() => setShowFeedback(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 px-6 pb-6">
          <div className="flex gap-2">
            {canCancel && !rescheduleMode && (
              <Button variant="secondary" size="sm" onClick={() => setRescheduleMode(true)}>
                <Calendar size={13} /> Reschedule
              </Button>
            )}
            {canFeedback && !showFeedback && (
              <Button variant="secondary" size="sm" onClick={() => setShowFeedback(true)}>
                <MessageSquare size={13} /> Add Feedback
              </Button>
            )}
          </div>
          {canCancel && (
            <Button variant="danger" size="sm" onClick={() => setConfirmCancel(true)}>
              <XCircle size={13} /> Cancel Interview
            </Button>
          )}
        </div>

        <ConfirmModal
          open={confirmCancel}
          title="Cancel interview"
          description={`Are you sure you want to cancel ${interview.candidateName}'s interview? They will be notified.`}
          onConfirm={handleCancel}
          onCancel={() => setConfirmCancel(false)}
          loading={cancelling}
        />
      </div>
    </div>
  );
}

// ─── Schedule modal ───────────────────────────────────────────────────────────

function ScheduleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (iv: InterviewDto) => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    candidateName: '', candidateId: 'c-new',
    jobTitle: '', jobId: 'j-new',
    type: 'Video' as InterviewType,
    scheduledAt: '',
    duration: 60,
    meetingLink: '', location: '',
    notes: '',
  });
  const [selectedInterviewers, setSelectedInterviewers] = useState<InterviewerDto[]>([]);
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.candidateName.trim()) e.candidateName = 'Candidate name is required';
    if (!form.scheduledAt)          e.scheduledAt   = 'Date and time are required';
    return e;
  }

  function toggleInterviewer(iv: InterviewerDto) {
    setSelectedInterviewers((p) =>
      p.some((s) => s.id === iv.id) ? p.filter((s) => s.id !== iv.id) : [...p, iv],
    );
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      const { interview } = await interviewsApi.create({
        candidateId:   form.candidateId,
        candidateName: form.candidateName,
        jobId:         form.jobId,
        jobTitle:      form.jobTitle,
        interviewers:  selectedInterviewers,
        type:          form.type,
        scheduledAt:   new Date(form.scheduledAt).toISOString(),
        duration:      form.duration,
        meetingLink:   form.meetingLink || undefined,
        location:      form.location || undefined,
        notes:         form.notes || undefined,
      });
      onCreated(interview);
      showToast('Interview scheduled successfully');
      onClose();
    } catch { showToast('Failed to schedule interview', 'error'); }
    finally { setSaving(false); }
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Schedule Interview</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-surface)] rounded-lg">
            <X size={15} className="text-[var(--color-text-muted)]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Candidate name</label>
              <Input value={form.candidateName} onChange={f('candidateName')} placeholder="e.g. Emily Carter" />
              {errors.candidateName && <p className="text-xs text-red-500 mt-1">{errors.candidateName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Job title</label>
              <Input value={form.jobTitle} onChange={f('jobTitle')} placeholder="e.g. Senior Engineer" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Type</label>
              <select value={form.type} onChange={f('type')}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
                {INTERVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Duration (min)</label>
              <select value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
                {DURATIONS.map((d) => <option key={d} value={d}>{d} min{d >= 60 ? ` (${d/60}h)` : ''}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Date & Time</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={f('scheduledAt')}
              className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]" />
            {errors.scheduledAt && <p className="text-xs text-red-500 mt-1">{errors.scheduledAt}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
              {form.type === 'On-site' ? 'Location' : 'Meeting link'} <span className="font-normal opacity-60">(optional)</span>
            </label>
            {form.type === 'On-site'
              ? <Input value={form.location} onChange={f('location')} placeholder="e.g. 12 Finsbury Sq, London" />
              : <Input value={form.meetingLink} onChange={f('meetingLink')} placeholder="https://zoom.us/j/..." />
            }
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">Interviewers</label>
            <div className="space-y-1.5">
              {TEAM_MEMBERS.map((iv) => {
                const selected = selectedInterviewers.some((s) => s.id === iv.id);
                return (
                  <button key={iv.id} type="button" onClick={() => toggleInterviewer(iv)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-colors ${selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]'}`}>
                    <Avatar name={iv.name} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{iv.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{iv.role}</p>
                    </div>
                    {selected && <Check size={14} className="text-[var(--color-primary)]" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Notes <span className="font-normal opacity-60">(optional)</span></label>
            <textarea value={form.notes} onChange={f('notes')} rows={2} placeholder="Any prep notes or context..."
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" isLoading={saving} onClick={handleSubmit}>
            <Calendar size={14} /> Schedule Interview
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Week calendar view ───────────────────────────────────────────────────────

function WeekView({ interviews, weekStart, onInterviewClick }: {
  interviews: InterviewDto[]; weekStart: Date; onInterviewClick: (iv: InterviewDto) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const totalH = (HOUR_END - HOUR_START) * ROW_H;

  function ivForDay(day: Date): InterviewDto[] {
    const ds = isoDate(day);
    return interviews.filter((iv) => iv.scheduledAt.startsWith(ds));
  }

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
      {/* Day headers */}
      <div className="grid border-b border-[var(--color-border)]" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        <div className="border-r border-[var(--color-border)]" />
        {days.map((day) => {
          const today = isoDate(new Date()) === isoDate(day);
          return (
            <div key={isoDate(day)} className="text-center py-3 border-r border-[var(--color-border)] last:border-r-0">
              <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                {day.toLocaleDateString('en-GB', { weekday: 'short' })}
              </p>
              <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5 ${today ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-primary)]'}`}>
                <span className="text-sm font-semibold">{day.getDate()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="relative overflow-y-auto" style={{ maxHeight: '480px' }}>
        <div className="relative grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)', height: `${totalH}px` }}>
          {/* Hour labels */}
          <div className="relative">
            {hours.map((h) => (
              <div key={h} className="absolute right-2 text-[10px] text-[var(--color-text-muted)]"
                style={{ top: `${(h - HOUR_START) * ROW_H - 8}px` }}>
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => (
            <div key={isoDate(day)} className="relative border-l border-[var(--color-border)]">
              {/* Hour lines */}
              {hours.map((h) => (
                <div key={h} className="absolute w-full border-t border-[var(--color-border)]"
                  style={{ top: `${(h - HOUR_START) * ROW_H}px` }} />
              ))}
              {/* Interviews */}
              {ivForDay(day).map((iv) => {
                const { top, height } = interviewPosition(iv.scheduledAt, iv.duration);
                return (
                  <button key={iv.id} onClick={() => onInterviewClick(iv)}
                    className={`absolute left-1 right-1 rounded-lg border px-1.5 py-1 text-left overflow-hidden ${TYPE_COLOR[iv.type]} hover:opacity-80 transition-opacity`}
                    style={{ top: `${top}px`, height: `${height}px` }}>
                    <p className="text-[11px] font-semibold truncate leading-tight">{iv.candidateName}</p>
                    {height > 36 && <p className="text-[10px] opacity-80 truncate">{fmtTime(iv.scheduledAt)} · {iv.duration}m</p>}
                    {iv.status === 'cancelled' && <div className="absolute inset-0 bg-neutral-100/70 flex items-center justify-center"><span className="text-[10px] font-bold text-neutral-500">CANCELLED</span></div>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({ interviews, onInterviewClick }: { interviews: InterviewDto[]; onInterviewClick: (iv: InterviewDto) => void }) {
  if (interviews.length === 0) {
    return (
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-12 text-center">
        <Calendar size={32} className="text-[var(--color-text-muted)] mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No interviews found</p>
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, InterviewDto[]> = {};
  for (const iv of interviews) {
    const key = iv.scheduledAt.slice(0, 10);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(iv);
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, ivs]) => (
        <div key={date}>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            {fmtDate(`${date}T00:00:00Z`)}
          </p>
          <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card divide-y divide-[var(--color-border)]">
            {ivs.map((iv) => (
              <button key={iv.id} onClick={() => onInterviewClick(iv)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--color-surface)] transition-colors text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${TYPE_COLOR[iv.type]}`}>
                  {TYPE_ICON[iv.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{iv.candidateName}</p>
                    <Badge variant={STATUS_CONFIG[iv.status]?.variant ?? 'default'}>
                      {STATUS_CONFIG[iv.status]?.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{iv.jobTitle} · {iv.type}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{fmtTime(iv.scheduledAt)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{iv.duration} min</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {iv.interviewers.slice(0, 3).map((iw) => (
                    <Avatar key={iw.id} name={iw.name} size="sm" />
                  ))}
                  {iv.interviewers.length > 3 && (
                    <span className="text-[11px] text-[var(--color-text-muted)]">+{iv.interviewers.length - 3}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InterviewsPage() {
  const { showToast } = useToast();
  const [view, setView]                   = useState<ViewMode>('week');
  const [interviews, setInterviews]       = useState<InterviewDto[]>([]);
  const [loading, setLoading]             = useState(true);
  const [weekStart, setWeekStart]         = useState(() => startOfWeek(new Date()));
  const [scheduleOpen, setScheduleOpen]   = useState(false);
  const [detailIv, setDetailIv]           = useState<InterviewDto | null>(null);
  const [filterStatus, setFilterStatus]   = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { interviews: ivs } = await interviewsApi.getAll();
      setInterviews(ivs);
    } catch { showToast('Failed to load interviews', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus === 'all' ? interviews : interviews.filter((iv) => iv.status === filterStatus);

  const weekEnd = addDays(weekStart, 6);
  const weekInterviews = filtered.filter((iv) => {
    const d = iv.scheduledAt.slice(0, 10);
    return d >= isoDate(weekStart) && d <= isoDate(weekEnd);
  });

  // Stat counts
  const upcoming  = interviews.filter((iv) => iv.status === 'scheduled' && iv.scheduledAt >= new Date().toISOString()).length;
  const thisWeek  = weekInterviews.filter((iv) => iv.status === 'scheduled').length;
  const pending   = interviews.filter((iv) => (iv.status === 'completed' || iv.status === 'scheduled') && !iv.feedback).length;

  function handleCreated(iv: InterviewDto) {
    setInterviews((p) => [...p, iv]);
  }

  function handleCancelled(id: string) {
    setInterviews((p) => p.map((iv) => iv.id === id ? { ...iv, status: 'cancelled' } : iv));
  }

  function handleFeedbackSubmitted(updated: InterviewDto) {
    setInterviews((p) => p.map((iv) => iv.id === updated.id ? updated : iv));
  }

  const STATUS_FILTERS = ['all', 'scheduled', 'completed', 'cancelled', 'no-show'];

  return (
    <div className="p-8 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">Interviews</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Schedule and track all candidate interviews</p>
          </div>
        </div>
        <Button variant="primary" size="md" onClick={() => setScheduleOpen(true)}>
          <Plus size={14} /> Schedule Interview
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Upcoming',         value: upcoming,                      icon: <Clock size={14} />,         color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'This Week',        value: thisWeek,                      icon: <Calendar size={14} />,      color: 'text-purple-600',  bg: 'bg-purple-50' },
          { label: 'Feedback Pending', value: pending,                       icon: <MessageSquare size={14} />, color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Total This Month', value: interviews.filter((iv) => iv.scheduledAt.startsWith('2026-03')).length, icon: <CheckCircle2 size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-5">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{s.value}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        {/* Status filter */}
        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={[
                'px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors',
                filterStatus === s
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-white border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]',
              ].join(' ')}>
              {s === 'all' ? 'All' : s.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </button>
          ))}
        </div>

        {/* View toggle + week navigation */}
        <div className="flex items-center gap-3">
          {view === 'week' && (
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekStart((d) => addDays(d, -7))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium text-[var(--color-text-primary)] px-2 whitespace-nowrap">
                {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
                {weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button onClick={() => setWeekStart((d) => addDays(d, 7))}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors">
                <ChevronRight size={14} />
              </button>
              <button onClick={() => setWeekStart(startOfWeek(new Date()))}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors">
                Today
              </button>
            </div>
          )}
          <div className="flex rounded-xl border border-[var(--color-border)] overflow-hidden">
            {(['week', 'list'] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={[
                  'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  view === v ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]',
                ].join(' ')}>
                {v === 'week' ? 'Week' : 'List'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar / list */}
      {loading ? (
        <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card p-12 text-center animate-pulse">
          <div className="h-4 w-32 bg-neutral-100 rounded mx-auto mb-3" />
          <div className="h-3 w-24 bg-neutral-100 rounded mx-auto" />
        </div>
      ) : view === 'week' ? (
        <WeekView interviews={weekInterviews} weekStart={weekStart} onInterviewClick={setDetailIv} />
      ) : (
        <ListView interviews={filtered} onInterviewClick={setDetailIv} />
      )}

      {scheduleOpen && <ScheduleModal onClose={() => setScheduleOpen(false)} onCreated={handleCreated} />}
      {detailIv && (
        <DetailModal
          interview={detailIv}
          onClose={() => setDetailIv(null)}
          onCancelled={handleCancelled}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      )}
    </div>
  );
}
