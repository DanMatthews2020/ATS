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
  candidatePanelApi, followUpsApi,
  type CandidateDetailDto, type InterviewType,
  type CandidateNoteDto, type FeedEventDto, type CandidateFeedbackDto,
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';
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

// ─── More Dropdown ────────────────────────────────────────────────────────────

function MoreDropdown({ candidate, onScheduleInterview, onSendOffer }: {
  candidate: CandidateDetailDto;
  onScheduleInterview: () => void;
  onSendOffer: () => void;
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
        { label: 'Enroll in Sequence', icon: RefreshCw, action: () => comingSoon('Enroll in Sequence') },
        { label: 'Schedule Interview', icon: Calendar, action: () => { setOpen(false); onScheduleInterview(); } },
        { label: 'Submit Feedback', icon: MessageSquare, action: () => comingSoon('Submit Feedback') },
      ],
    },
    {
      title: 'Job Management',
      items: [
        { label: 'Consider for Job', icon: Briefcase, action: () => comingSoon('Consider for Job') },
        { label: 'Send Offer', icon: FileText, action: () => { setOpen(false); onSendOffer(); } },
      ],
    },
    {
      title: 'Organisation',
      items: [
        { label: 'Add to Project', icon: FolderOpen, action: () => comingSoon('Add to Project') },
        { label: 'Find Email', icon: Search, action: () => comingSoon('Find Email') },
        { label: 'Merge Profiles', icon: GitMerge, action: () => comingSoon('Merge Profiles') },
        { label: 'Add Referral', icon: UserPlus, action: () => comingSoon('Add Referral') },
      ],
    },
    {
      title: 'Admin',
      items: [
        { label: 'Do Not Contact', icon: UserX, action: () => comingSoon('Do Not Contact') },
        { label: 'Delete Profile', icon: Trash2, action: () => comingSoon('Delete Profile'), danger: true },
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

  return (
    <div className="p-8 max-w-4xl">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Candidates
      </button>

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

                <Button variant="secondary" size="sm" onClick={() => setEmailOpen(true)}>
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
      {activeTab === 'feed'         && <FeedTab candidateId={id} />}
      {activeTab === 'notes'        && <NotesTab candidateId={id} candidate={candidate} />}
      {activeTab === 'feedback'     && <FeedbackTab candidateId={id} />}
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
    </div>
  );
}
