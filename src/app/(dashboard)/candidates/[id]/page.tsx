'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, MapPin, Linkedin, Calendar,
  Briefcase, Award, FileText, Loader2, Star, Clock,
  MessageSquare, Activity, ChevronRight, X, Check,
  ChevronDown, MoreHorizontal, Pencil, Trash2, Send,
  Bell, UserPlus, RefreshCw, FolderOpen, Search,
  GitMerge, UserX, AlertTriangle,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  candidatesApi, applicationsApi, interviewsApi, offersApi,
  candidatePanelApi, followUpsApi, sequencesApi, projectsApi, jobsApi,
  referralsApi, teamApi,
  type CandidateDetailDto, type InterviewType,
  type CandidateNoteDto, type FeedEventDto, type CandidateFeedbackDto,
  type SequenceDto, type ProjectDto, type JobListingDto,
  type TeamMemberDto, type ReferralDto,
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import ScorecardModal from '@/components/ScorecardModal';
import type { BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  new:       { label: 'New',       variant: 'info' },
  screening: { label: 'Screening', variant: 'default' },
  interview: { label: 'Interview', variant: 'warning' },
  offer:     { label: 'Offer',     variant: 'success' },
  hired:     { label: 'Hired',     variant: 'success' },
  rejected:  { label: 'Rejected',  variant: 'error' },
};

const STAGE_ORDER = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'];

const STATUS_TO_DB: Record<string, string> = {
  new:       'APPLIED',
  screening: 'SCREENING',
  interview: 'INTERVIEW',
  offer:     'OFFER',
  hired:     'HIRED',
  rejected:  'REJECTED',
};

const OFFER_STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  draft:    { label: 'Draft',    variant: 'default' },
  sent:     { label: 'Sent',     variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'error' },
  expired:  { label: 'Expired',  variant: 'error' },
};

const INTERVIEW_STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  scheduled:  { label: 'Scheduled', variant: 'info' },
  completed:  { label: 'Completed', variant: 'success' },
  cancelled:  { label: 'Cancelled', variant: 'error' },
  no_show:    { label: 'No Show',   variant: 'error' },
};

const EMAIL_TEMPLATES = [
  {
    id: 'initial-reach-out',
    label: 'Initial Reach Out',
    subject: 'Exciting opportunity at TeamTalent',
    body: 'Hi {{candidateName}},\n\nI came across your profile and wanted to reach out about an exciting opportunity we have available.\n\nWould you be open to a quick call to discuss?\n\nBest regards',
  },
  {
    id: 'interview-invite',
    label: 'Interview Invitation',
    subject: 'Interview Invitation — {{jobTitle}}',
    body: 'Hi {{candidateName}},\n\nThank you for your application for the {{jobTitle}} role. We\'d love to invite you to the next stage.\n\nPlease let us know your availability for the coming week.\n\nBest regards',
  },
  {
    id: 'follow-up',
    label: 'Follow Up',
    subject: 'Following up on your application',
    body: 'Hi {{candidateName}},\n\nI wanted to follow up on your application for the {{jobTitle}} position. We are still reviewing applications and will be in touch shortly.\n\nThanks for your patience.',
  },
  {
    id: 'rejection',
    label: 'Rejection',
    subject: 'Your application for {{jobTitle}}',
    body: 'Hi {{candidateName}},\n\nThank you for taking the time to apply and interview with us for the {{jobTitle}} position. After careful consideration, we have decided to move forward with another candidate.\n\nWe will keep your profile on file for future opportunities.\n\nBest regards',
  },
];

type Tab = 'feed' | 'notes' | 'feedback' | 'emails' | 'interviews' | 'overview' | 'applications';

const TABS: { id: Tab; label: string }[] = [
  { id: 'feed',         label: 'Feed' },
  { id: 'notes',        label: 'Notes' },
  { id: 'feedback',     label: 'Feedback' },
  { id: 'emails',       label: 'Emails' },
  { id: 'interviews',   label: 'Interviews' },
  { id: 'overview',     label: 'Overview' },
  { id: 'applications', label: 'Applications' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function formatSalary(salary: string, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(salary));
}

function substituteVars(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─── Follow Up Dropdown ───────────────────────────────────────────────────────

function FollowUpDropdown({ candidateId, followUps, onChanged }: {
  candidateId: string;
  followUps: { id: string; followUpDate: string; isCompleted: boolean }[];
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen]         = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const nextPending = followUps.find((f) => !f.isCompleted);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  async function schedule(date: Date) {
    try {
      await followUpsApi.create({ candidateId, followUpDate: date.toISOString() });
      showToast(`Follow-up set for ${formatDate(date.toISOString())}`, 'success');
      onChanged();
    } catch {
      showToast('Failed to set follow-up', 'error');
    }
    setOpen(false);
  }

  async function markDone(id: string) {
    try {
      await followUpsApi.update(id, { isCompleted: true });
      showToast('Follow-up marked complete', 'success');
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
    <div ref={ref} className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
        <Clock size={13} />
        {nextPending ? `Follow Up · ${formatDate(nextPending.followUpDate)}` : 'Follow Up'}
        <ChevronDown size={11} />
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-52 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-20 py-1.5">
          {nextPending && (
            <>
              <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                Pending
              </div>
              <button
                onClick={() => { markDone(nextPending.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
              >
                <Check size={13} className="text-green-500" />
                Mark complete ({formatDate(nextPending.followUpDate)})
              </button>
              <div className="border-t border-[var(--color-border)] my-1" />
              <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                Reschedule
              </div>
            </>
          )}
          {!nextPending && (
            <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              Schedule Follow-up
            </div>
          )}
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
                onClick={() => {
                  if (customDate) { schedule(new Date(customDate + 'T12:00:00')); setCustomOpen(false); }
                }}
              >
                Set Date
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Email Compose Modal ──────────────────────────────────────────────────────

function EmailModal({ candidate, onClose }: {
  candidate: CandidateDetailDto;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const latestApp = candidate.applications[0];
  const templateVars = {
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    jobTitle: latestApp?.jobTitle ?? 'the role',
    companyName: 'TeamTalent',
  };

  const [templateId, setTemplateId] = useState('');
  const [form, setForm] = useState({
    to: candidate.email,
    cc: '',
    subject: '',
    body: '',
  });
  const [sending, setSending] = useState(false);

  function applyTemplate(id: string) {
    const tmpl = EMAIL_TEMPLATES.find((t) => t.id === id);
    if (!tmpl) return;
    setTemplateId(id);
    setForm((prev) => ({
      ...prev,
      subject: substituteVars(tmpl.subject, templateVars),
      body: substituteVars(tmpl.body, templateVars),
    }));
  }

  async function handleSend() {
    if (!form.subject.trim() || !form.body.trim()) {
      showToast('Subject and body are required', 'error');
      return;
    }
    setSending(true);
    try {
      // Stub — email sending not yet implemented server-side
      await new Promise((r) => setTimeout(r, 600));
      showToast(`Email sent to ${form.to}`, 'success');
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">New Email</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {/* Template picker */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Template</label>
            <select
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            >
              <option value="">— None —</option>
              {EMAIL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">To</label>
            <Input value={form.to} onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">CC <span className="font-normal opacity-60">(optional)</span></label>
            <Input value={form.cc} onChange={(e) => setForm((p) => ({ ...p, cc: e.target.value }))} placeholder="cc@company.com" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Subject</label>
            <Input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Email subject" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              rows={8}
              placeholder="Write your email here…"
              className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={sending} onClick={handleSend}>
            <Send size={13} /> Send Email
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Change Stage Dropdown ────────────────────────────────────────────────────

function ChangeStageDropdown({ candidate, onStageChanged }: {
  candidate: CandidateDetailDto;
  onStageChanged: (appId: string, newStatus: string) => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const latestApp = candidate.applications[0];

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  if (!latestApp) return null;

  const currentCfg = STATUS_CONFIG[latestApp.status] ?? { label: latestApp.status, variant: 'default' as BadgeVariant };

  async function handleSelect(stage: string) {
    if (stage === latestApp.status || saving) return;
    setSaving(true);
    setOpen(false);
    try {
      await applicationsApi.updateStage(latestApp.id, STATUS_TO_DB[stage] ?? stage.toUpperCase());
      onStageChanged(latestApp.id, stage);
      showToast('Stage updated', 'success');
    } catch {
      showToast('Failed to update stage', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <Button variant="primary" size="sm" onClick={() => setOpen(!open)} disabled={saving}>
        {saving
          ? <Loader2 size={13} className="animate-spin" />
          : <Activity size={13} />
        }
        {currentCfg.label}
        <ChevronDown size={11} />
      </Button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-44 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-20 py-1.5">
          <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
            Move to stage
          </div>
          {STAGE_ORDER.map((stage) => {
            const cfg = STATUS_CONFIG[stage];
            const isCurrent = stage === latestApp.status;
            return (
              <button
                key={stage}
                onClick={() => handleSelect(stage)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors ${
                  isCurrent
                    ? 'text-[var(--color-text-muted)] cursor-default'
                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
                }`}
              >
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
                {isCurrent && <Check size={12} className="text-[var(--color-primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Enroll in Sequence Modal ─────────────────────────────────────────────────

function EnrollInSequenceModal({ candidateId, candidateName, onClose }: {
  candidateId: string;
  candidateName: string;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const { showToast } = useToast();
  const [sequences, setSequences] = useState<SequenceDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<SequenceDto | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    sequencesApi.getAll()
      .then((d) => setSequences(d.sequences.filter((s) => s.status === 'ACTIVE')))
      .catch(() => showToast('Failed to load sequences', 'error'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEnroll() {
    if (!selected) return;
    setEnrolling(true);
    try {
      await sequencesApi.enroll(selected.id, { candidateId });
      showToast(`${candidateName} enrolled in ${selected.name}`, 'success');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('already enrolled') || msg.includes('P2002')) {
        showToast(`${candidateName} is already enrolled in this sequence`, 'error');
      } else {
        showToast('Failed to enroll in sequence', 'error');
      }
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Enroll in Sequence</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : sequences.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[var(--color-text-muted)] mb-3">No active sequences found.</p>
              <a href="/sequences" className="text-sm text-[var(--color-primary)] hover:underline">
                Create a sequence →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {sequences.map((seq) => (
                <button
                  key={seq.id}
                  onClick={() => setSelected(seq)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    selected?.id === seq.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{seq.name}</span>
                    {selected?.id === seq.id && <Check size={14} className="text-[var(--color-primary)]" />}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {seq.stepCount} step{seq.stepCount !== 1 ? 's' : ''} · {seq.enrolledCount} enrolled
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleEnroll}
            disabled={!selected || enrolling}
          >
            {enrolling ? <><Loader2 size={13} className="animate-spin" /> Enrolling…</> : 'Enroll'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Add to Project Modal ─────────────────────────────────────────────────────

function AddToProjectModal({ candidateId, candidateName, onClose }: {
  candidateId: string;
  candidateName: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { showToast } = useToast();
  const [projects, setProjects]   = useState<ProjectDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    projectsApi.getAll()
      .then((d) => setProjects(d.projects))
      .catch(() => showToast('Failed to load projects', 'error'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);
    let added = 0;
    let skipped = 0;
    for (const projectId of Array.from(selected)) {
      try {
        await projectsApi.addCandidate(projectId, candidateId);
        added++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('P2002') || msg.includes('already')) {
          skipped++;
        } else {
          showToast('Failed to add to one or more projects', 'error');
          setSaving(false);
          return;
        }
      }
    }
    if (added > 0) {
      showToast(`${candidateName} added to ${added} project${added !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} already a member)` : ''}`, 'success');
    } else {
      showToast(`${candidateName} is already a member of all selected projects`, 'info');
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Add to Project</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[var(--color-text-muted)] mb-3">No projects found.</p>
              <a href="/projects" className="text-sm text-[var(--color-primary)] hover:underline">
                Create a project →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((proj) => {
                const checked = selected.has(proj.id);
                return (
                  <button
                    key={proj.id}
                    onClick={() => toggle(proj.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      checked
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{proj.name}</span>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        checked ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]'
                      }`}>
                        {checked && <Check size={10} className="text-white" />}
                      </div>
                    </div>
                    {proj.description && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{proj.description}</p>
                    )}
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {proj.candidateCount} candidate{proj.candidateCount !== 1 ? 's' : ''} · {proj.category}
                    </p>
                  </button>
                );
              })}
              <a
                href="/projects"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-surface)] rounded-xl transition-colors"
              >
                <FolderOpen size={13} /> Create New Project
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            disabled={selected.size === 0 || saving}
          >
            {saving ? <><Loader2 size={13} className="animate-spin" /> Adding…</> : `Add to ${selected.size > 0 ? selected.size : ''} Project${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
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
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-red-600">Mark as Do Not Contact</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-800">
              This will block all emails to {candidateName} and remove them from all active sequences. This flag can be removed later.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              {DNC_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context…"
              rows={3}
              className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleConfirm} disabled={saving}
            className="!bg-red-600 hover:!bg-red-700 !border-red-600">
            {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Mark as Do Not Contact'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RemoveDoNotContactModal({ candidateId, candidateName, onClose, onConfirmed }: {
  candidateId: string;
  candidateName: string;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  async function handleRemove() {
    setSaving(true);
    try {
      await candidatesApi.setDoNotContact(candidateId, { doNotContact: false });
      showToast('Do Not Contact flag removed', 'success');
      onConfirmed();
      onClose();
    } catch {
      showToast('Failed to remove flag', 'error');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Remove Do Not Contact Flag</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={16} /></button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-[var(--color-text-muted)]">
            Remove the Do Not Contact flag from <strong className="text-[var(--color-text-primary)]">{candidateName}</strong>? You will be able to contact and enrol them in sequences again.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)]">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleRemove} disabled={saving}>
            {saving ? <><Loader2 size={13} className="animate-spin" /> Removing…</> : 'Remove flag'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Referral Modal ───────────────────────────────────────────────────────

const REFERRAL_RELATIONSHIPS = [
  { value: 'former-colleague',      label: 'Former colleague' },
  { value: 'friend',                label: 'Friend' },
  { value: 'university',            label: 'University connection' },
  { value: 'professional-network',  label: 'Professional network' },
  { value: 'other',                 label: 'Other' },
];

function AddReferralModal({ candidateId, onClose, onAdded }: {
  candidateId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { showToast } = useToast();
  const [members, setMembers]       = useState<TeamMemberDto[]>([]);
  const [openJobs, setOpenJobs]     = useState<JobListingDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMemberDto | null>(null);
  const [relationship, setRelationship] = useState('former-colleague');
  const [selectedJob, setSelectedJob]   = useState<JobListingDto | null>(null);
  const [note, setNote]                 = useState('');
  const [referralDate, setReferralDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    Promise.all([
      teamApi.getAll().catch(() => ({ members: [] as TeamMemberDto[] })),
      jobsApi.getJobs(1, 100, 'OPEN').catch(() => ({ items: [] as JobListingDto[], total: 0, page: 1, limit: 100, totalPages: 0 })),
    ]).then(([teamData, jobData]) => {
      setMembers(teamData.members);
      setOpenJobs(jobData.items);
    }).finally(() => setLoading(false));
  }, []);

  const filteredMembers = members.filter((m) =>
    !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  async function handleSubmit() {
    if (!selectedMember) { showToast('Please select who is referring this candidate', 'error'); return; }
    setSaving(true);
    try {
      await referralsApi.create({
        candidateId,
        referredByName: selectedMember.name,
        referredByEmail: selectedMember.email,
        relationship,
        jobId: selectedJob?.id,
        jobTitle: selectedJob?.title,
        note: note.trim() || undefined,
        referralDate,
      });
      showToast(`Referral added from ${selectedMember.name}`, 'success');
      onAdded();
      onClose();
    } catch {
      showToast('Failed to add referral', 'error');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Add Referral</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={16} /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" /></div>
          ) : (
            <>
              {/* Referred by */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Referred by *</label>
                <Input placeholder="Search team members…" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
                {!selectedMember && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-[var(--color-border)] rounded-xl">
                    {filteredMembers.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No members found</p>
                    ) : filteredMembers.map((m) => (
                      <button key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(m.name); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-[var(--color-surface)] transition-colors text-left">
                        <Avatar name={m.name} size="sm" />
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">{m.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{m.department}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedMember && (
                  <div className="mt-2 flex items-center justify-between px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
                    <div className="flex items-center gap-2">
                      <Avatar name={selectedMember.name} size="sm" />
                      <span className="text-sm text-[var(--color-text-primary)]">{selectedMember.name}</span>
                    </div>
                    <button onClick={() => { setSelectedMember(null); setMemberSearch(''); }} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={13} /></button>
                  </div>
                )}
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Relationship</label>
                <select value={relationship} onChange={(e) => setRelationship(e.target.value)}
                  className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]">
                  {REFERRAL_RELATIONSHIPS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* Referred for job */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Referred for job (optional)</label>
                <select value={selectedJob?.id ?? ''} onChange={(e) => setSelectedJob(openJobs.find(j => j.id === e.target.value) ?? null)}
                  className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]">
                  <option value="">No specific job</option>
                  {openJobs.map((j) => <option key={j.id} value={j.id}>{j.title} ({j.department})</option>)}
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Note (optional)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add context about the referral…" rows={3}
                  className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none" />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Referral date</label>
                <Input type="date" value={referralDate} onChange={(e) => setReferralDate(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!selectedMember || saving}>
            {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Add Referral'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Merge Profiles Modal ─────────────────────────────────────────────────────

const MERGEABLE_FIELDS: { key: keyof CandidateDetailDto; label: string }[] = [
  { key: 'firstName',   label: 'First Name' },
  { key: 'lastName',    label: 'Last Name' },
  { key: 'phone',       label: 'Phone' },
  { key: 'linkedInUrl', label: 'LinkedIn' },
  { key: 'location',    label: 'Location' },
];

function MergeProfilesModal({ currentCandidate, onClose, onMerged }: {
  currentCandidate: CandidateDetailDto;
  onClose: () => void;
  onMerged: (keepId: string) => void;
}) {
  const { showToast } = useToast();
  const [step, setStep]             = useState<'search' | 'resolve'>('search');
  const [search, setSearch]         = useState('');
  const [results, setResults]       = useState<import('@/lib/api').CandidateListDto[]>([]);
  const [searching, setSearching]   = useState(false);
  const [duplicate, setDuplicate]   = useState<CandidateDetailDto | null>(null);
  const [loadingDup, setLoadingDup] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, 'keep' | 'merge'>>({});
  const [merging, setMerging]       = useState(false);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await candidatesApi.getCandidates(1, 20, search);
        setResults(d.items.filter((c) => c.id !== currentCandidate.id));
      } catch {/* ignore */}
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [search, currentCandidate.id]);

  async function selectDuplicate(id: string) {
    setLoadingDup(true);
    try {
      const d = await candidatesApi.getCandidate(id);
      setDuplicate(d.candidate);
      // Pre-set resolutions: always keep for current, merge for dup when current is empty
      const initial: Record<string, 'keep' | 'merge'> = {};
      for (const { key } of MERGEABLE_FIELDS) {
        const keepVal = currentCandidate[key];
        const mergeVal = d.candidate[key];
        initial[key as string] = keepVal ? 'keep' : (mergeVal ? 'merge' : 'keep');
      }
      setResolutions(initial);
      setStep('resolve');
    } catch { showToast('Failed to load candidate', 'error'); }
    setLoadingDup(false);
  }

  async function handleMerge() {
    if (!duplicate) return;
    setMerging(true);
    try {
      await candidatesApi.merge(currentCandidate.id, duplicate.id, resolutions);
      showToast('Profiles merged successfully', 'success');
      onMerged(currentCandidate.id);
      onClose();
    } catch {
      showToast('Failed to merge profiles', 'error');
    } finally { setMerging(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Merge Profiles</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {step === 'search' ? 'Find the duplicate profile to merge' : 'Resolve field conflicts'}
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={16} /></button>
        </div>

        {step === 'search' ? (
          <>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="flex items-start gap-2.5 mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">All data from the duplicate will be merged into the current profile. This cannot be undone.</p>
              </div>
              <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="mt-3 space-y-2">
                {searching && <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-[var(--color-text-muted)]" /></div>}
                {!searching && results.map((c) => (
                  <button key={c.id} onClick={() => selectDuplicate(c.id)} disabled={loadingDup}
                    className="w-full flex items-center gap-3 px-4 py-3 border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface)] transition-colors text-left">
                    <Avatar name={c.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{c.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{c.email}</p>
                      {c.latestJobTitle && <p className="text-xs text-[var(--color-text-muted)]">{c.latestJobTitle}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-[var(--color-text-muted)]">{c.source}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{formatDate(c.createdAt)}</p>
                    </div>
                    {loadingDup && <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0">
              <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            </div>
          </>
        ) : duplicate ? (
          <>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {/* Summary row */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[{ label: 'Keeping (current)', cand: currentCandidate }, { label: 'Merging (duplicate)', cand: duplicate }].map(({ label, cand }) => (
                  <div key={cand.id} className="px-4 py-3 border border-[var(--color-border)] rounded-xl">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{label}</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{cand.firstName} {cand.lastName}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{cand.email}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{cand.applications.length} application{cand.applications.length !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>

              {/* Field conflict table */}
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Field Conflicts</p>
              <div className="border border-[var(--color-border)] rounded-xl overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-surface)]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">Field</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">Current</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">Duplicate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {MERGEABLE_FIELDS.map(({ key, label }) => {
                      const keepVal = String(currentCandidate[key] ?? '—');
                      const mergeVal = String(duplicate[key] ?? '—');
                      const hasBoth = currentCandidate[key] && duplicate[key];
                      return (
                        <tr key={key as string} className={hasBoth ? '' : 'opacity-60'}>
                          <td className="px-3 py-2 text-[var(--color-text-muted)] font-medium">{label}</td>
                          <td className="px-3 py-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name={key as string} value="keep"
                                checked={resolutions[key as string] === 'keep'}
                                onChange={() => setResolutions((r) => ({ ...r, [key as string]: 'keep' }))}
                                className="accent-[var(--color-primary)]" />
                              <span className={`text-xs ${resolutions[key as string] === 'keep' ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>{keepVal}</span>
                            </label>
                          </td>
                          <td className="px-3 py-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name={key as string} value="merge"
                                checked={resolutions[key as string] === 'merge'}
                                onChange={() => setResolutions((r) => ({ ...r, [key as string]: 'merge' }))}
                                className="accent-[var(--color-primary)]" />
                              <span className={`text-xs ${resolutions[key as string] === 'merge' ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>{mergeVal}</span>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-[var(--color-text-muted)] space-y-1">
                <p className="font-semibold text-[var(--color-text-primary)]">Automatically merged:</p>
                <p>• All applications, interviews, and offers from the duplicate</p>
                <p>• All notes, feedback, and activity history</p>
                <p>• Sequence enrollments and project memberships</p>
                <p>• Referrals and follow-ups</p>
              </div>
            </div>
            <div className="flex justify-between gap-2 px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0">
              <Button variant="secondary" size="sm" onClick={() => { setStep('search'); setDuplicate(null); }}>← Back</Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleMerge} disabled={merging}
                  className="!bg-red-600 hover:!bg-red-700 !border-red-600">
                  {merging ? <><Loader2 size={13} className="animate-spin" /> Merging…</> : 'Confirm Merge'}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── Consider for Job Modal ───────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { value: 'APPLIED',   label: 'New Lead' },
  { value: 'SCREENING', label: 'Replied / Phone Screen' },
  { value: 'INTERVIEW', label: 'Hiring Manager Interview' },
  { value: 'OFFER',     label: 'Final Interview' },
];

function ConsiderForJobModal({ candidateId, candidateName, existingJobIds, onClose, onAdded }: {
  candidateId: string;
  candidateName: string;
  existingJobIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const { showToast } = useToast();
  const [allJobs, setAllJobs]   = useState<JobListingDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<JobListingDto | null>(null);
  const [stage, setStage]       = useState('APPLIED');
  const [saving, setSaving]     = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    jobsApi.getJobs(1, 100, 'OPEN')
      .then((d) => setAllJobs(d.items))
      .catch(() => showToast('Failed to load jobs', 'error'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = allJobs.filter((j) =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.department.toLowerCase().includes(search.toLowerCase())
  );

  async function handleConfirm() {
    if (!selected) return;
    const alreadyIn = existingJobIds.includes(selected.id);
    if (alreadyIn && !showWarning) { setShowWarning(true); return; }
    setSaving(true);
    try {
      await applicationsApi.createApplication({ candidateId, jobPostingId: selected.id, status: stage });
      showToast(`Added to ${selected.title} pipeline`, 'success');
      onAdded();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('ALREADY_EXISTS') || msg.includes('already applied')) {
        showToast(`${candidateName} is already in the ${selected.title} pipeline`, 'error');
      } else {
        showToast('Failed to add to pipeline', 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  const alreadyIn = selected ? existingJobIds.includes(selected.id) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Consider for Job</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search jobs by title or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[var(--color-text-muted)]">
                {search ? 'No jobs match your search.' : 'No open jobs found.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {filtered.map((job) => {
                const inPipeline = existingJobIds.includes(job.id);
                return (
                  <button
                    key={job.id}
                    onClick={() => { setSelected(job); setShowWarning(false); }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                      selected?.id === job.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{job.title}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {inPipeline && <Badge variant="warning">In pipeline</Badge>}
                        {selected?.id === job.id && <Check size={14} className="text-[var(--color-primary)]" />}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {job.department} · {job.location} · {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Stage selector — shown once a job is picked */}
          {selected && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Add at stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full text-sm border border-[var(--color-border)] rounded-lg px-3 py-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Already in pipeline warning */}
          {showWarning && alreadyIn && (
            <div className="mt-3 flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                {candidateName} is already in the <strong>{selected?.title}</strong> pipeline. Add anyway?
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            disabled={!selected || saving}
          >
            {saving ? <><Loader2 size={13} className="animate-spin" /> Adding…</> : showWarning ? 'Add anyway' : 'Add to pipeline'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Profile Modal ─────────────────────────────────────────────────────

function DeleteProfileModal({ candidateId, candidateName, applicationCount, interviewCount, noteCount, onClose, onDeleted }: {
  candidateId: string;
  candidateName: string;
  applicationCount: number;
  interviewCount: number;
  noteCount: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { showToast } = useToast();
  const [step, setStep]         = useState<1 | 2>(1);
  const [typed, setTyped]       = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmed = typed === candidateName;

  async function handleDelete() {
    if (!confirmed) return;
    setDeleting(true);
    try {
      await candidatesApi.deleteCandidate(candidateId);
      showToast('Profile permanently deleted', 'success');
      onDeleted();
    } catch {
      showToast('Failed to delete profile', 'error');
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-red-600">
            {step === 1 ? 'Delete Profile' : 'Confirm Deletion'}
          </h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>

        {step === 1 ? (
          <>
            <div className="px-6 py-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">This will permanently delete:</p>
                  <ul className="space-y-1 text-sm text-[var(--color-text-muted)]">
                    <li>• Profile and all contact details</li>
                    <li>• All applications ({applicationCount})</li>
                    <li>• All interviews ({interviewCount})</li>
                    <li>• All notes and feedback ({noteCount})</li>
                    <li>• All emails and activity history</li>
                    <li>• All sequence enrollments and project memberships</li>
                  </ul>
                  <p className="text-sm font-semibold text-red-600 mt-3">This CANNOT be undone.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)]">
              <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep(2)}
                className="!bg-red-600 hover:!bg-red-700 !border-red-600"
              >
                Continue to delete →
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 py-5">
              <p className="text-sm text-[var(--color-text-muted)] mb-3">
                Type <strong className="text-[var(--color-text-primary)]">{candidateName}</strong> to confirm:
              </p>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={candidateName}
                autoFocus
              />
              {typed.length > 0 && !confirmed && (
                <p className="text-xs text-red-500 mt-1.5">Name doesn&apos;t match — type it exactly</p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[var(--color-border)]">
              <Button variant="secondary" size="sm" onClick={() => { setStep(1); setTyped(''); }}>Back</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDelete}
                disabled={!confirmed || deleting}
                className={confirmed ? '!bg-red-600 hover:!bg-red-700 !border-red-600' : ''}
              >
                {deleting ? <><Loader2 size={13} className="animate-spin" /> Deleting…</> : 'Delete permanently'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── More Dropdown ────────────────────────────────────────────────────────────

function MoreDropdown({ candidate, onScheduleInterview, onSendOffer, onSubmitFeedback, onEnrollInSequence, onAddToProject, onConsiderForJob, onDeleteProfile, onDoNotContact, onAddReferral, onMergeProfiles }: {
  candidate: CandidateDetailDto;
  onScheduleInterview: () => void;
  onSendOffer: () => void;
  onSubmitFeedback: () => void;
  onEnrollInSequence: () => void;
  onAddToProject: () => void;
  onConsiderForJob: () => void;
  onDeleteProfile: () => void;
  onDoNotContact: () => void;
  onAddReferral: () => void;
  onMergeProfiles: () => void;
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

  function comingSoon(label: string) {
    showToast(`${label} — coming soon`, 'info');
    setOpen(false);
  }

  const sections = [
    {
      title: 'Engagement',
      items: [
        { label: 'Enroll in Sequence', icon: RefreshCw, action: () => { setOpen(false); onEnrollInSequence(); } },
        { label: 'Schedule Interview', icon: Calendar, action: () => { setOpen(false); onScheduleInterview(); } },
        { label: 'Submit Feedback', icon: MessageSquare, action: () => { setOpen(false); onSubmitFeedback(); } },
      ],
    },
    {
      title: 'Job Management',
      items: [
        { label: 'Consider for Job', icon: Briefcase, action: () => { setOpen(false); onConsiderForJob(); } },
        { label: 'Send Offer', icon: FileText, action: () => { setOpen(false); onSendOffer(); } },
      ],
    },
    {
      title: 'Organisation',
      items: [
        { label: 'Add to Project', icon: FolderOpen, action: () => { setOpen(false); onAddToProject(); } },
        { label: 'Find Email', icon: Search, action: () => comingSoon('Find Email') },
        { label: 'Merge Profiles', icon: GitMerge, action: () => { setOpen(false); onMergeProfiles(); } },
        { label: 'Add Referral', icon: UserPlus, action: () => { setOpen(false); onAddReferral(); } },
      ],
    },
    {
      title: 'Admin',
      items: [
        { label: 'Do Not Contact', icon: UserX, action: () => { setOpen(false); onDoNotContact(); } },
        { label: 'Delete Profile', icon: Trash2, action: () => { setOpen(false); onDeleteProfile(); }, danger: true },
      ],
    },
  ];

  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
        <MoreHorizontal size={14} />
        More
      </Button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-52 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-20 py-1.5 max-h-[400px] overflow-y-auto">
          {sections.map((section, si) => (
            <div key={si}>
              {si > 0 && <div className="border-t border-[var(--color-border)] my-1" />}
              <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors hover:bg-[var(--color-surface)] ${
                      item.danger ? 'text-red-600' : 'text-[var(--color-text-primary)]'
                    }`}
                  >
                    <Icon size={13} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Move Stage Modal (used in Applications tab) ──────────────────────────────

function MoveStageModal({ appId, currentStatus, jobTitle, onClose, onMoved }: {
  appId: string;
  currentStatus: string;
  jobTitle: string;
  onClose: () => void;
  onMoved: (appId: string, newStatus: string) => void;
}) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState(currentStatus);
  const [saving, setSaving]     = useState(false);

  async function handleSave() {
    if (selected === currentStatus) { onClose(); return; }
    setSaving(true);
    try {
      await applicationsApi.updateStage(appId, STATUS_TO_DB[selected] ?? selected.toUpperCase());
      onMoved(appId, selected);
      showToast('Stage updated successfully', 'success');
      onClose();
    } catch {
      showToast('Failed to update stage', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Move Stage</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">{jobTitle}</p>
        <div className="space-y-2 mb-6">
          {STAGE_ORDER.map((stage) => {
            const cfg = STATUS_CONFIG[stage];
            const isCurrent  = stage === currentStatus;
            const isSelected = stage === selected;
            return (
              <button
                key={stage}
                onClick={() => setSelected(stage)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-text-secondary)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isSelected
                    ? <div className="w-4 h-4 rounded-full bg-[var(--color-primary)] flex items-center justify-center"><Check size={10} className="text-white" /></div>
                    : <div className="w-4 h-4 rounded-full border-2 border-[var(--color-border)]" />
                  }
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
                {isCurrent && <span className="text-xs text-[var(--color-text-muted)]">current</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Interview Modal ─────────────────────────────────────────────────

const INTERVIEW_TYPES: InterviewType[] = ['Phone', 'Video', 'On-site', 'Technical'];
const DURATIONS = [15, 30, 45, 60, 90, 120];

function ScheduleInterviewModal({ candidate, onClose, onCreated }: {
  candidate: CandidateDetailDto;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [appId, setAppId] = useState(candidate.applications[0]?.id ?? '');
  const [form, setForm]   = useState({
    type: 'Video' as InterviewType,
    scheduledAt: '',
    duration: 60,
    meetingLink: '', location: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const e: Record<string, string> = {};
    if (!appId)            e.appId       = 'Select a job application';
    if (!form.scheduledAt) e.scheduledAt = 'Date and time are required';
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      await interviewsApi.create({
        applicationId: appId,
        candidateId:   candidate.id,
        type:          form.type,
        scheduledAt:   new Date(form.scheduledAt).toISOString(),
        duration:      form.duration,
        meetingLink:   form.meetingLink || undefined,
        location:      form.location   || undefined,
        notes:         form.notes      || undefined,
      });
      onCreated();
      showToast('Interview scheduled');
      onClose();
    } catch { showToast('Failed to schedule interview', 'error'); }
    finally { setSaving(false); }
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  if (candidate.applications.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Schedule Interview</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">This candidate has no applications. Add them to a job posting first.</p>
          <Button variant="primary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Schedule Interview</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{candidate.firstName} {candidate.lastName}</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {candidate.applications.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Job Application</label>
              <select value={appId} onChange={(e) => setAppId(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
                {candidate.applications.map((a) => <option key={a.id} value={a.id}>{a.jobTitle}</option>)}
              </select>
              {errors.appId && <p className="text-xs text-red-500 mt-1">{errors.appId}</p>}
            </div>
          )}
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
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Notes <span className="font-normal opacity-60">(optional)</span></label>
            <textarea value={form.notes} onChange={f('notes')} rows={2} placeholder="Any prep notes or context…"
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={saving} onClick={handleSubmit}>
            <Calendar size={13} /> Schedule Interview
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Send Offer Modal ─────────────────────────────────────────────────────────

const CURRENCIES = ['GBP', 'USD', 'EUR', 'AUD', 'CAD'];

function SendOfferModal({ candidate, onClose, onCreated }: {
  candidate: CandidateDetailDto;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [appId, setAppId] = useState(candidate.applications[0]?.id ?? '');
  const [form, setForm]   = useState({
    salary: '', currency: 'GBP',
    startDate: '', expiryDate: '',
    equity: '', benefits: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit() {
    const e: Record<string, string> = {};
    if (!appId)                                         e.appId      = 'Select a job application';
    if (!form.salary || isNaN(Number(form.salary)))     e.salary     = 'Valid salary is required';
    if (!form.expiryDate)                               e.expiryDate = 'Expiry date is required';
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      await offersApi.create({
        applicationId: appId,
        candidateId:   candidate.id,
        salary:        Number(form.salary),
        currency:      form.currency,
        startDate:     form.startDate  || undefined,
        expiryDate:    form.expiryDate || undefined,
        equity:        form.equity     || undefined,
        benefits:      form.benefits,
        notes:         form.notes      || undefined,
      });
      onCreated();
      showToast('Offer created as draft');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create offer';
      showToast(msg, 'error');
    } finally { setSaving(false); }
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  if (candidate.applications.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Send Offer</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">This candidate has no applications. Add them to a job posting first.</p>
          <Button variant="primary" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Send Offer</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{candidate.firstName} {candidate.lastName}</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {candidate.applications.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Job Application</label>
              <select value={appId} onChange={(e) => setAppId(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
                {candidate.applications.map((a) => <option key={a.id} value={a.id}>{a.jobTitle}</option>)}
              </select>
              {errors.appId && <p className="text-xs text-red-500 mt-1">{errors.appId}</p>}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Annual salary</label>
              <Input value={form.salary} onChange={f('salary')} type="number" placeholder="85000" />
              {errors.salary && <p className="text-xs text-red-500 mt-1">{errors.salary}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Currency</label>
              <select value={form.currency} onChange={f('currency')}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Start date <span className="font-normal opacity-60">(optional)</span></label>
              <input type="date" value={form.startDate} onChange={f('startDate')}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Expiry date</label>
              <input type="date" value={form.expiryDate} onChange={f('expiryDate')}
                className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
              {errors.expiryDate && <p className="text-xs text-red-500 mt-1">{errors.expiryDate}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Equity <span className="font-normal opacity-60">(optional)</span></label>
            <Input value={form.equity} onChange={f('equity')} placeholder="e.g. 0.05% over 4 years" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Benefits summary <span className="font-normal opacity-60">(optional)</span></label>
            <textarea value={form.benefits} onChange={f('benefits')} rows={2}
              placeholder="Private health, 25 days annual leave…"
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Internal notes <span className="font-normal opacity-60">(optional)</span></label>
            <textarea value={form.notes} onChange={f('notes')} rows={2}
              placeholder="Internal context about this offer…"
              className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={saving} onClick={handleSubmit}>
            <FileText size={13} /> Create Offer Draft
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Feed ────────────────────────────────────────────────────────────────

function FeedTab({ candidateId }: { candidateId: string }) {
  const [feed, setFeed]       = useState<FeedEventDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    candidatePanelApi.getFeed(candidateId)
      .then((d) => setFeed(d.feed))
      .catch(() => {/* silently use empty */})
      .finally(() => setLoading(false));
  }, [candidateId]);

  const iconMap: Record<string, React.ElementType> = {
    applied:              Briefcase,
    stage_changed:        Activity,
    interview_scheduled:  Calendar,
    interview_completed:  Check,
    offer_sent:           FileText,
    offer_accepted:       Award,
    offer_rejected:       X,
    note_added:           MessageSquare,
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
    </div>
  );

  if (feed.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No activity yet.</p>
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
                  <p className="text-xs text-[var(--color-text-muted)]">{formatDateTime(item.timestamp)}</p>
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

// ─── Tab: Notes ───────────────────────────────────────────────────────────────

function NotesTab({ candidateId, candidate }: { candidateId: string; candidate: CandidateDetailDto }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [notes, setNotes]     = useState<CandidateNoteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [appId, setAppId]     = useState(candidate.applications[0]?.id ?? '');
  const [saving, setSaving]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText]   = useState('');

  const load = useCallback(async () => {
    try {
      const d = await candidatePanelApi.getNotes(candidateId);
      setNotes(d.notes);
    } catch {/* silently use empty */}
    finally { setLoading(false); }
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!noteText.trim()) return;
    setSaving(true);
    try {
      const d = await candidatePanelApi.createNote(candidateId, {
        content: noteText.trim(),
        applicationId: appId || undefined,
      });
      setNotes((prev) => [d.note, ...prev]);
      setNoteText('');
      showToast('Note saved', 'success');
    } catch {
      showToast('Failed to save note', 'error');
    } finally { setSaving(false); }
  }

  async function handleUpdate(noteId: string) {
    if (!editText.trim()) return;
    try {
      const d = await candidatePanelApi.updateNote(candidateId, noteId, editText.trim());
      setNotes((prev) => prev.map((n) => n.id === noteId ? d.note : n));
      setEditingId(null);
      showToast('Note updated', 'success');
    } catch {
      showToast('Failed to update note', 'error');
    }
  }

  async function handleDelete(noteId: string) {
    try {
      await candidatePanelApi.deleteNote(candidateId, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      showToast('Note deleted', 'success');
    } catch {
      showToast('Failed to delete note', 'error');
    }
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Add note */}
      <Card padding="lg">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">Add Note</h3>
        {candidate.applications.length > 1 && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Application</label>
            <select value={appId} onChange={(e) => setAppId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30">
              <option value="">— No application —</option>
              {candidate.applications.map((a) => <option key={a.id} value={a.id}>{a.jobTitle}</option>)}
            </select>
          </div>
        )}
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add an internal note…"
          rows={3}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-none mb-3"
        />
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={handleCreate} disabled={!noteText.trim() || saving}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Save Note
          </Button>
        </div>
      </Card>

      {/* Existing notes */}
      {notes.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No notes yet.</p>
      ) : (
        notes.map((note) => (
          <Card key={note.id} padding="lg">
            {editingId === note.id ? (
              <>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-none mb-3"
                />
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={() => handleUpdate(note.id)}>Save</Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={note.authorName} size="sm" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">{note.authorName}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{formatDateTime(note.createdAt)}</p>
                    </div>
                  </div>
                  {note.jobTitle && (
                    <Badge variant="default">{note.jobTitle}</Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{note.content}</p>
                <div className="flex gap-1 mt-3">
                  <button
                    onClick={() => { setEditingId(note.id); setEditText(note.content); }}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Tab: Feedback ────────────────────────────────────────────────────────────

function FeedbackTab({ candidateId }: { candidateId: string }) {
  const [feedback, setFeedback] = useState<CandidateFeedbackDto[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    candidatePanelApi.getFeedback(candidateId)
      .then((d) => setFeedback(d.feedback))
      .catch(() => {/* silently use empty */})
      .finally(() => setLoading(false));
  }, [candidateId]);

  const recLabel: Record<string, string> = {
    hire: 'Strong Hire', 'no-hire': 'No Hire', maybe: 'Maybe',
  };
  const recVariant: Record<string, BadgeVariant> = {
    hire: 'success', 'no-hire': 'error', maybe: 'warning',
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
    </div>
  );

  if (feedback.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No interview feedback yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {feedback.map((fb) => {
        const statusCfg = INTERVIEW_STATUS_CONFIG[fb.status] ?? { label: fb.status, variant: 'default' as BadgeVariant };
        return (
          <Card key={fb.id} padding="lg">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] capitalize">{fb.interviewType} Interview</span>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
                {fb.jobTitle && <p className="text-xs text-[var(--color-text-muted)]">{fb.jobTitle}</p>}
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{formatDateTime(fb.scheduledAt)}</p>
              </div>
              {fb.recommendation && (
                <Badge variant={recVariant[fb.recommendation] ?? 'default'}>
                  {recLabel[fb.recommendation] ?? fb.recommendation}
                </Badge>
              )}
            </div>
            {fb.rating != null && (
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    className={i < fb.rating! ? 'text-amber-400 fill-amber-400' : 'text-[var(--color-border)]'}
                  />
                ))}
                <span className="text-xs text-[var(--color-text-muted)] ml-1">{fb.rating}/5</span>
              </div>
            )}
            {fb.feedback && (
              <div className="pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Notes</p>
                <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{fb.feedback}</p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab: Emails ──────────────────────────────────────────────────────────────

function EmailsTab({ candidateId, onCompose }: { candidateId: string; onCompose: () => void }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    candidatePanelApi.getEmails(candidateId)
      .catch(() => {/* silently ignore */})
      .finally(() => setLoading(false));
  }, [candidateId]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
    </div>
  );

  return (
    <Card padding="lg">
      <div className="text-center py-10">
        <Mail size={28} className="text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">No emails yet</p>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Emails sent to this candidate will appear here.</p>
        <Button variant="secondary" size="sm" onClick={onCompose}>
          <Send size={13} /> Compose Email
        </Button>
      </div>
    </Card>
  );
}

// ─── Tab: Interviews ──────────────────────────────────────────────────────────

function InterviewsTab({ candidate }: { candidate: CandidateDetailDto }) {
  const allInterviews = candidate.applications.flatMap((app) =>
    app.interviews.map((iv) => ({ ...iv, jobTitle: app.jobTitle }))
  ).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  if (allInterviews.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No interviews scheduled yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {allInterviews.map((iv) => {
        const statusCfg = INTERVIEW_STATUS_CONFIG[iv.status] ?? { label: iv.status, variant: 'default' as BadgeVariant };
        return (
          <Card key={iv.id} padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] capitalize">{iv.type} Interview</span>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mb-2">{iv.jobTitle}</p>
                <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1"><Calendar size={11} /> {formatDateTime(iv.scheduledAt)}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {iv.duration} min</span>
                  {iv.rating != null && (
                    <span className="flex items-center gap-1"><Star size={11} /> {iv.rating}/5</span>
                  )}
                </div>
                {iv.feedback && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Feedback</p>
                    <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{iv.feedback}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ candidate }: { candidate: CandidateDetailDto }) {
  const latestApp = candidate.applications[0];
  return (
    <div className="space-y-5">
      <Card padding="lg">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
              <Mail size={14} className="text-[var(--color-text-muted)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Email</p>
              <a href={`mailto:${candidate.email}`} className="text-sm text-blue-600 hover:underline">{candidate.email}</a>
            </div>
          </div>
          {candidate.phone && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                <Phone size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Phone</p>
                <p className="text-sm text-[var(--color-text-primary)]">{candidate.phone}</p>
              </div>
            </div>
          )}
          {candidate.location && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                <MapPin size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Location</p>
                <p className="text-sm text-[var(--color-text-primary)]">{candidate.location}</p>
              </div>
            </div>
          )}
          {candidate.linkedInUrl && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                <Linkedin size={14} className="text-[var(--color-text-muted)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">LinkedIn</p>
                <a href={candidate.linkedInUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  View Profile <ChevronRight size={11} />
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>

      {candidate.skills.length > 0 && (
        <Card padding="lg">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {candidate.skills.map((skill) => (
              <span key={skill} className="px-3 py-1.5 text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)]">
                {skill}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card padding="lg">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Source</p>
            <p className="text-[var(--color-text-primary)] capitalize">{candidate.source}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Added</p>
            <p className="text-[var(--color-text-primary)]">{formatDate(candidate.createdAt)}</p>
          </div>
          {latestApp && (
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Latest Role</p>
              <p className="text-[var(--color-text-primary)]">{latestApp.jobTitle}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Applications</p>
            <p className="text-[var(--color-text-primary)]">{candidate.applications.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Tab: Applications ────────────────────────────────────────────────────────

function ApplicationsTab({ candidate, onMoveStage }: {
  candidate: CandidateDetailDto;
  onMoveStage: (appId: string, jobTitle: string, currentStatus: string) => void;
}) {
  if (candidate.applications.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-sm text-[var(--color-text-muted)] text-center py-12">No applications yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {candidate.applications.map((app) => {
        const statusCfg = STATUS_CONFIG[app.status] ?? { label: app.status, variant: 'default' as BadgeVariant };
        return (
          <Card key={app.id} padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <Briefcase size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{app.jobTitle}</h3>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] ml-[22px]">
                  {app.jobDepartment} · {app.jobLocation}
                </p>
                {app.stage && (
                  <p className="text-xs text-[var(--color-text-muted)] ml-[22px] mt-0.5">Stage: {app.stage}</p>
                )}
                <div className="flex items-center gap-4 mt-3 ml-[22px] text-xs text-[var(--color-text-muted)]">
                  <span>Applied {formatDate(app.appliedAt)}</span>
                  <span>Updated {formatDate(app.lastUpdated)}</span>
                  {app.interviews.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {app.interviews.length} interview{app.interviews.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onMoveStage(app.id, app.jobTitle, app.status)}
                className="flex-shrink-0 text-xs text-[var(--color-primary)] hover:underline font-medium"
              >
                Move stage
              </button>
            </div>

            {app.offer && (() => {
              const offerCfg = OFFER_STATUS_CONFIG[app.offer!.status] ?? { label: app.offer!.status, variant: 'default' as BadgeVariant };
              return (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">Offer: {formatSalary(app.offer!.salary, app.offer!.currency)}</span>
                  <Badge variant={offerCfg.variant}>{offerCfg.label}</Badge>
                </div>
              );
            })()}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CandidateProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { showToast } = useToast();

  const [candidate, setCandidate] = useState<CandidateDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  // Follow-ups
  const [followUps, setFollowUps] = useState<{ id: string; followUpDate: string; isCompleted: boolean }[]>([]);

  // Modals
  const [stageModal, setStageModal]   = useState<{ appId: string; jobTitle: string; currentStatus: string } | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [offerOpen, setOfferOpen]       = useState(false);
  const [emailOpen, setEmailOpen]       = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [enrollOpen, setEnrollOpen]     = useState(false);
  const [projectOpen, setProjectOpen]   = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [dncOpen, setDncOpen]           = useState(false);
  const [removeDncOpen, setRemoveDncOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [mergeOpen, setMergeOpen]       = useState(false);

  // Feed refresh key — increment to force FeedTab remount
  const [feedKey, setFeedKey] = useState(0);
  const [feedbackKey, setFeedbackKey] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [candData, fuData] = await Promise.all([
          candidatesApi.getCandidate(id),
          followUpsApi.getByCandidateId(id).catch(() => ({ followUps: [] })),
        ]);
        setCandidate(candData.candidate);
        setFollowUps(fuData.followUps);
      } catch {
        setError('Candidate not found.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  async function reloadFollowUps() {
    try {
      const d = await followUpsApi.getByCandidateId(id);
      setFollowUps(d.followUps);
    } catch {/* silently ignore */}
  }

  function handleStageUpdated(appId: string, newStatus: string) {
    setCandidate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        applications: prev.applications.map((app) =>
          app.id === appId ? { ...app, status: newStatus } : app
        ),
      };
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to Candidates
        </button>
        <p className="text-sm text-red-600">{error || 'Candidate not found.'}</p>
      </div>
    );
  }

  const fullName   = `${candidate.firstName} ${candidate.lastName}`;
  const latestApp  = candidate.applications[0];
  const latestStatus = latestApp ? (STATUS_CONFIG[latestApp.status] ?? null) : null;
  const totalInterviews = candidate.applications.reduce((sum, a) => sum + a.interviews.length, 0);
  const existingJobIds = candidate.applications.map((a) => a.jobId);
  const totalNotes = 0; // notes count not available in CandidateDetailDto without separate fetch

  return (
    <div className="p-8 max-w-4xl">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Candidates
      </button>

      {/* Do Not Contact Banner */}
      {candidate.doNotContact && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 mb-4 bg-red-600 text-white rounded-xl">
          <div className="flex items-center gap-2.5">
            <UserX size={16} className="flex-shrink-0" />
            <span className="text-sm font-semibold">
              DO NOT CONTACT
              {candidate.doNotContactReason && ` — ${DNC_REASONS.find(r => r.value === candidate.doNotContactReason)?.label ?? candidate.doNotContactReason}`}
              {candidate.doNotContactAt && ` · Marked on ${formatDate(candidate.doNotContactAt)}`}
            </span>
          </div>
          <button
            onClick={() => setRemoveDncOpen(true)}
            className="text-xs text-white/80 hover:text-white underline flex-shrink-0"
          >
            Remove flag
          </button>
        </div>
      )}

      {/* Referral Badge */}
      {candidate.referrals.length > 0 && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
          <UserPlus size={13} className="text-[var(--color-text-muted)]" />
          <span className="text-sm text-[var(--color-text-muted)]">
            Referred by <strong className="text-[var(--color-text-primary)]">{candidate.referrals[0].referredByName}</strong>
            {candidate.referrals[0].jobTitle && ` for ${candidate.referrals[0].jobTitle}`}
            {candidate.referrals.length > 1 && ` (+${candidate.referrals.length - 1} more)`}
          </span>
        </div>
      )}

      {/* Header */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-start gap-5">
          <Avatar name={fullName} size="lg" />

          <div className="flex-1 min-w-0">
            {/* Name + badge row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{fullName}</h1>
                {latestApp && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{latestApp.jobTitle}</p>
                )}
                {latestStatus && (
                  <Badge variant={latestStatus.variant} className="mt-2">{latestStatus.label}</Badge>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <FollowUpDropdown
                  candidateId={id}
                  followUps={followUps}
                  onChanged={reloadFollowUps}
                />

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => !candidate.doNotContact && setEmailOpen(true)}
                  disabled={candidate.doNotContact}
                  title={candidate.doNotContact ? 'Cannot email — marked as Do Not Contact' : undefined}
                >
                  <Mail size={13} /> Email
                </Button>

                <ChangeStageDropdown
                  candidate={candidate}
                  onStageChanged={handleStageUpdated}
                />

                <MoreDropdown
                  candidate={candidate}
                  onScheduleInterview={() => setScheduleOpen(true)}
                  onSendOffer={() => setOfferOpen(true)}
                  onSubmitFeedback={() => setFeedbackOpen(true)}
                  onEnrollInSequence={() => setEnrollOpen(true)}
                  onAddToProject={() => setProjectOpen(true)}
                  onConsiderForJob={() => setJobModalOpen(true)}
                  onDeleteProfile={() => setDeleteOpen(true)}
                  onDoNotContact={() => setDncOpen(true)}
                  onAddReferral={() => setReferralOpen(true)}
                  onMergeProfiles={() => setMergeOpen(true)}
                />
              </div>
            </div>

            {/* Contact row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-[var(--color-text-muted)]">
              <a href={`mailto:${candidate.email}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                <Mail size={13} /> {candidate.email}
              </a>
              {candidate.phone && (
                <span className="flex items-center gap-1.5"><Phone size={13} />{candidate.phone}</span>
              )}
              {candidate.location && (
                <span className="flex items-center gap-1.5"><MapPin size={13} />{candidate.location}</span>
              )}
              {candidate.linkedInUrl && (
                <a href={candidate.linkedInUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline">
                  <Linkedin size={13} /> LinkedIn
                </a>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> Added {formatDate(candidate.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
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
              <span className="text-xs bg-[var(--color-surface)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-full">
                {candidate.applications.length}
              </span>
            )}
            {tab.id === 'interviews' && totalInterviews > 0 && (
              <span className="text-xs bg-[var(--color-surface)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-full">
                {totalInterviews}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'feed'         && <FeedTab key={feedKey} candidateId={id} />}
      {activeTab === 'notes'        && <NotesTab candidateId={id} candidate={candidate} />}
      {activeTab === 'feedback'     && <FeedbackTab key={feedbackKey} candidateId={id} />}
      {activeTab === 'emails'       && <EmailsTab candidateId={id} onCompose={() => setEmailOpen(true)} />}
      {activeTab === 'interviews'   && <InterviewsTab candidate={candidate} />}
      {activeTab === 'overview'     && <OverviewTab candidate={candidate} />}
      {activeTab === 'applications' && (
        <ApplicationsTab
          candidate={candidate}
          onMoveStage={(appId, jobTitle, currentStatus) => setStageModal({ appId, jobTitle, currentStatus })}
        />
      )}

      {/* Modals */}
      {stageModal && (
        <MoveStageModal
          appId={stageModal.appId}
          currentStatus={stageModal.currentStatus}
          jobTitle={stageModal.jobTitle}
          onClose={() => setStageModal(null)}
          onMoved={handleStageUpdated}
        />
      )}

      {scheduleOpen && (
        <ScheduleInterviewModal
          candidate={candidate}
          onClose={() => setScheduleOpen(false)}
          onCreated={() => setScheduleOpen(false)}
        />
      )}

      {offerOpen && (
        <SendOfferModal
          candidate={candidate}
          onClose={() => setOfferOpen(false)}
          onCreated={() => setOfferOpen(false)}
        />
      )}

      {emailOpen && (
        <EmailModal
          candidate={candidate}
          onClose={() => setEmailOpen(false)}
        />
      )}

      {feedbackOpen && latestApp && (
        <ScorecardModal
          candidateId={id}
          candidateName={fullName}
          jobId={latestApp.jobId}
          onClose={() => setFeedbackOpen(false)}
          onSubmitted={() => {
            setFeedbackOpen(false);
            setFeedbackKey((k) => k + 1);
            setFeedKey((k) => k + 1);
          }}
        />
      )}

      {feedbackOpen && !latestApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              This candidate has no active applications. Feedback requires a linked job.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setFeedbackOpen(false)}>Close</Button>
          </div>
        </div>
      )}

      {enrollOpen && (
        <EnrollInSequenceModal
          candidateId={id}
          candidateName={fullName}
          onClose={() => setEnrollOpen(false)}
          onEnrolled={() => setFeedKey((k) => k + 1)}
        />
      )}

      {projectOpen && (
        <AddToProjectModal
          candidateId={id}
          candidateName={fullName}
          onClose={() => setProjectOpen(false)}
          onAdded={() => setFeedKey((k) => k + 1)}
        />
      )}

      {jobModalOpen && (
        <ConsiderForJobModal
          candidateId={id}
          candidateName={fullName}
          existingJobIds={existingJobIds}
          onClose={() => setJobModalOpen(false)}
          onAdded={() => {
            setFeedKey((k) => k + 1);
            // Reload candidate to update applications list
            candidatesApi.getCandidate(id).then((d) => setCandidate(d.candidate)).catch(() => {});
          }}
        />
      )}

      {deleteOpen && (
        <DeleteProfileModal
          candidateId={id}
          candidateName={fullName}
          applicationCount={candidate.applications.length}
          interviewCount={totalInterviews}
          noteCount={totalNotes}
          onClose={() => setDeleteOpen(false)}
          onDeleted={() => router.push('/candidates')}
        />
      )}

      {dncOpen && (
        <DoNotContactModal
          candidateId={id}
          candidateName={fullName}
          onClose={() => setDncOpen(false)}
          onConfirmed={() => {
            candidatesApi.getCandidate(id).then((d) => setCandidate(d.candidate)).catch(() => {});
            setFeedKey((k) => k + 1);
          }}
        />
      )}

      {removeDncOpen && (
        <RemoveDoNotContactModal
          candidateId={id}
          candidateName={fullName}
          onClose={() => setRemoveDncOpen(false)}
          onConfirmed={() => {
            candidatesApi.getCandidate(id).then((d) => setCandidate(d.candidate)).catch(() => {});
            setFeedKey((k) => k + 1);
          }}
        />
      )}

      {referralOpen && (
        <AddReferralModal
          candidateId={id}
          onClose={() => setReferralOpen(false)}
          onAdded={() => {
            candidatesApi.getCandidate(id).then((d) => setCandidate(d.candidate)).catch(() => {});
            setFeedKey((k) => k + 1);
          }}
        />
      )}

      {mergeOpen && (
        <MergeProfilesModal
          currentCandidate={candidate}
          onClose={() => setMergeOpen(false)}
          onMerged={(keepId) => {
            router.push(`/candidates/${keepId}`);
          }}
        />
      )}
    </div>
  );
}
