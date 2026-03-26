'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail, Settings, ChevronDown, Pencil, Check, X,
  Loader2, AlertTriangle, Plus, Trash2, MoreHorizontal,
  Info, Search, CheckSquare, Square, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import {
  sequencesApi, jobsApi,
  type SequenceDetailDto,
  type EnrollmentDto,
  type JobDetailDto,
} from '@/lib/api';
import type { BadgeVariant } from '@/types';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; dot: string }> = {
  ENROLLED:    { label: 'Enrolled',       variant: 'default',  dot: 'bg-blue-500' },
  ACTIVE:      { label: 'Enrolled',       variant: 'default',  dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'In Progress',    variant: 'warning',  dot: 'bg-amber-500' },
  COMPLETED:   { label: 'No Reply',       variant: 'default',  dot: 'bg-neutral-400' },
  REPLIED:     { label: 'Replied',        variant: 'success',  dot: 'bg-emerald-500' },
  INTERESTED:  { label: 'Interested',     variant: 'default',  dot: 'bg-violet-500' },
  CONVERTED:   { label: 'Converted',      variant: 'success',  dot: 'bg-teal-600' },
  STOPPED:     { label: 'Stopped',        variant: 'error',    dot: 'bg-red-500' },
};

const RESPONSE_OPTIONS = [
  'Interested',
  'Not Interested',
  'Wrong Person',
  'Already Applied',
  'Other',
];

// Status tabs definition
type TabKey = 'enrolled' | 'in_progress' | 'completed' | 'replied' | 'interested' | 'converted';

const TABS: { key: TabKey; label: string; statuses: string[]; tooltip: string }[] = [
  { key: 'enrolled',    label: 'Enrolled',            statuses: ['ENROLLED', 'ACTIVE'],  tooltip: 'Candidates who are enrolled and queued to receive emails.' },
  { key: 'in_progress', label: 'In Progress',         statuses: ['IN_PROGRESS'],          tooltip: 'Candidates actively receiving emails in the sequence.' },
  { key: 'completed',   label: 'Completed, No Reply', statuses: ['COMPLETED'],            tooltip: 'All steps sent but no reply received.' },
  { key: 'replied',     label: 'Replied',             statuses: ['REPLIED'],              tooltip: 'Candidates who replied to at least one email.' },
  { key: 'interested',  label: 'Interested',          statuses: ['INTERESTED'],           tooltip: 'Candidates marked as interested by the recruiter.' },
  { key: 'converted',   label: 'Converted',           statuses: ['CONVERTED'],            tooltip: 'Candidates who converted to an application.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, den: number): string {
  if (!den) return '0%';
  return `${Math.round((num / den) * 100)}%`;
}

// ─── Inline-editable name ─────────────────────────────────────────────────────

function InlineName({ initialName, onSave }: { initialName: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing]   = useState(false);
  const [value, setValue]       = useState(initialName);
  const [saving, setSaving]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(initialName); }, [initialName]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  async function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initialName) { setEditing(false); setValue(initialName); return; }
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setValue(initialName); } }}
          className="text-2xl font-bold text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)] bg-transparent outline-none w-80"
        />
        {saving && <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">{value}</h1>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all rounded"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({
  sequence,
  onClose,
  onSaved,
}: {
  sequence: SequenceDetailDto;
  onClose: () => void;
  onSaved: (updated: Partial<SequenceDetailDto>) => void;
}) {
  const { showToast } = useToast();
  const [stopOnReply,     setStopOnReply]     = useState(sequence.stopOnReply);
  const [stopOnInterview, setStopOnInterview] = useState(sequence.stopOnInterview);
  const [stopOnHired,     setStopOnHired]     = useState(sequence.stopOnHired);
  const [skipWeekends,    setSkipWeekends]    = useState(sequence.skipWeekends);
  const [linkedJobId,     setLinkedJobId]     = useState(sequence.linkedJobId ?? '');
  const [senderEmail,     setSenderEmail]     = useState(sequence.senderEmail ?? '');
  const [saving,          setSaving]          = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await sequencesApi.update(sequence.id, {
        stopOnReply,
        stopOnInterview,
        stopOnHired,
        skipWeekends,
        linkedJobId: linkedJobId || undefined,
        senderEmail: senderEmail || undefined,
      });
      onSaved({ stopOnReply, stopOnInterview, stopOnHired, skipWeekends, linkedJobId: linkedJobId || null, senderEmail: senderEmail || null });
      showToast('Settings saved', 'success');
      onClose();
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto shadow-2xl border-l border-[var(--color-border)] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Sequence Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)]"><X size={14} /></button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Toggles */}
          {([
            ['Stop if candidate replies',       stopOnReply,     setStopOnReply],
            ['Stop if interview scheduled',     stopOnInterview, setStopOnInterview],
            ['Stop if candidate hired',         stopOnHired,     setStopOnHired],
            ['Skip weekends',                   skipWeekends,    setSkipWeekends],
          ] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-primary)]">{label}</span>
              <button
                onClick={() => set(!val)}
                className={[
                  'relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0',
                  val ? 'bg-[var(--color-primary)]' : 'bg-neutral-200',
                ].join(' ')}
                style={{ height: '22px', width: '40px' }}
              >
                <span className={['absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform', val ? 'translate-x-[18px]' : 'translate-x-0.5'].join(' ')} style={{ width: '18px', height: '18px', transitionProperty: 'transform' }} />
              </button>
            </div>
          ))}

          {/* Linked job */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">Linked Job ID</label>
            <Input
              value={linkedJobId}
              onChange={(e) => setLinkedJobId(e.target.value)}
              placeholder="Job ID (optional)"
              className="text-sm h-9"
            />
          </div>

          {/* Sender email */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">Default Sender Email</label>
            <Input
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="e.g. recruiter@company.com"
              className="text-sm h-9"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-border)]">
          <Button variant="primary" size="md" onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── More dropdown ────────────────────────────────────────────────────────────

function MoreMenu({
  sequence,
  onArchive,
  onDelete,
}: {
  sequence: SequenceDetailDto;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>
        More
        <ChevronDown size={13} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[var(--color-border)] rounded-xl shadow-card-hover w-44 py-1 text-sm">
          <button
            onClick={() => { setOpen(false); onArchive(); }}
            className="w-full text-left px-3.5 py-2 hover:bg-[var(--color-surface)] text-[var(--color-text-primary)] transition-colors"
          >
            {sequence.status === 'ACTIVE' ? 'Pause sequence' : 'Activate sequence'}
          </button>
          <div className="my-1 border-t border-[var(--color-border)]" />
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-600 transition-colors"
          >
            Delete sequence
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Stat box ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info size={11} className="text-[var(--color-text-muted)] cursor-help" />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-neutral-800 text-white text-[11px] rounded-lg px-2.5 py-1.5 z-30 leading-relaxed pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
        </span>
      )}
    </span>
  );
}

// ─── Response dropdown ────────────────────────────────────────────────────────

function ResponseDropdown({
  enrollmentId,
  sequenceId,
  currentResponse,
  onUpdated,
}: {
  enrollmentId: string;
  sequenceId: string;
  currentResponse: string | null;
  onUpdated: (enrollmentId: string, response: string) => void;
}) {
  const { showToast } = useToast();
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleSelect(response: string) {
    setOpen(false);
    setSaving(true);
    try {
      await sequencesApi.setResponse(sequenceId, enrollmentId, response);
      onUpdated(enrollmentId, response);
      showToast('Response updated', 'success');
    } catch {
      showToast('Failed to update response', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface)] transition-colors whitespace-nowrap text-[var(--color-text-primary)]"
      >
        {saving ? <Loader2 size={10} className="animate-spin" /> : null}
        {currentResponse ?? 'Set Response'}
        <ChevronDown size={10} className="text-[var(--color-text-muted)]" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[var(--color-border)] rounded-xl shadow-card-hover w-40 py-1 text-xs">
          {RESPONSE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              className={[
                'w-full text-left px-3 py-2 hover:bg-[var(--color-surface)] transition-colors',
                currentResponse === opt ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  const [input, setInput] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Delete Sequence</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Type <strong className="text-[var(--color-text-primary)]">{name}</strong> to confirm deletion. This cannot be undone.
        </p>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={name}
          className="mb-4 text-sm"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={input !== name}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Unenroll confirm ─────────────────────────────────────────────────────────

function UnenrollModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">Unenroll candidate?</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-5">
          Unenroll <strong className="text-[var(--color-text-primary)]">{name}</strong> from this sequence? They will stop receiving emails.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={onConfirm} className="bg-red-600 hover:bg-red-700">Unenroll</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--color-border)]">
      {[...Array(9)].map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 bg-neutral-100 rounded animate-pulse" style={{ width: `${[50, 60, 40, 30, 40, 20, 20, 50, 30][i]}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SequenceDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const id       = params.id as string;
  const { showToast } = useToast();

  const [sequence,      setSequence]      = useState<SequenceDetailDto | null>(null);
  const [enrollments,   setEnrollments]   = useState<EnrollmentDto[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [error,         setError]         = useState('');
  const [activeTab,     setActiveTab]     = useState<TabKey>('enrolled');
  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [showSettings,  setShowSettings]  = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [unenrollTarget, setUnenrollTarget] = useState<EnrollmentDto | null>(null);
  const [linkedJob,     setLinkedJob]     = useState<JobDetailDto | null>(null);

  // ── Fetch sequence ──────────────────────────────────────────────────────
  const fetchSequence = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await sequencesApi.getById(id);
      setSequence(data.sequence);
      // Check linked job status
      if (data.sequence.linkedJobId) {
        try {
          const job = await jobsApi.getJob(data.sequence.linkedJobId);
          setLinkedJob(job.job);
        } catch { /* ignore, job may not exist */ }
      }
    } catch {
      setError('Failed to load sequence');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Fetch enrollments ───────────────────────────────────────────────────
  const fetchEnrollments = useCallback(async () => {
    setLoadingEnroll(true);
    try {
      const data = await sequencesApi.getEnrollments(id);
      setEnrollments(data.enrollments);
    } catch {
      showToast('Failed to load enrollments', 'error');
    } finally {
      setLoadingEnroll(false);
    }
  }, [id, showToast]);

  useEffect(() => { fetchSequence(); }, [fetchSequence]);
  useEffect(() => { if (!loading) fetchEnrollments(); }, [loading, fetchEnrollments]);

  // ── Save name ───────────────────────────────────────────────────────────
  async function handleSaveName(name: string) {
    if (!sequence) return;
    try {
      await sequencesApi.update(id, { name });
      setSequence((prev) => prev ? { ...prev, name } : prev);
    } catch {
      showToast('Failed to save name', 'error');
    }
  }

  // ── Save settings ───────────────────────────────────────────────────────
  function handleSettingsSaved(updated: Partial<SequenceDetailDto>) {
    setSequence((prev) => prev ? { ...prev, ...updated } : prev);
  }

  // ── Archive / toggle status ─────────────────────────────────────────────
  async function handleArchive() {
    if (!sequence) return;
    const next = sequence.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await sequencesApi.updateStatus(id, next);
      setSequence((prev) => prev ? { ...prev, status: next } : prev);
      showToast(next === 'PAUSED' ? 'Sequence paused' : 'Sequence activated', 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  async function handleDelete() {
    try {
      await sequencesApi.delete(id);
      showToast('Sequence deleted', 'success');
      router.push('/sequences');
    } catch {
      showToast('Failed to delete sequence', 'error');
    }
  }

  // ── Unenroll single ─────────────────────────────────────────────────────
  async function handleUnenroll(enrollment: EnrollmentDto) {
    try {
      await sequencesApi.unenroll(id, enrollment.candidateId);
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollment.id));
      setSequence((prev) => prev ? { ...prev, enrolledCount: prev.enrolledCount - 1, stats: { ...prev.stats, totalEnrolled: prev.stats.totalEnrolled - 1 } } : prev);
      showToast(`${enrollment.candidateName} unenrolled`, 'success');
    } catch {
      showToast('Failed to unenroll', 'error');
    }
    setUnenrollTarget(null);
  }

  // ── Bulk unenroll ───────────────────────────────────────────────────────
  async function handleBulkUnenroll() {
    const ids = Array.from(selected);
    let count = 0;
    for (const enrollId of ids) {
      const enroll = enrollments.find((e) => e.id === enrollId);
      if (!enroll) continue;
      try {
        await sequencesApi.unenroll(id, enroll.candidateId);
        count++;
      } catch { /* continue */ }
    }
    setEnrollments((prev) => prev.filter((e) => !selected.has(e.id)));
    setSelected(new Set());
    showToast(`${count} candidate${count !== 1 ? 's' : ''} unenrolled`, 'success');
  }

  // ── Response updated ────────────────────────────────────────────────────
  function handleResponseUpdated(enrollmentId: string, response: string) {
    setEnrollments((prev) =>
      prev.map((e) => e.id === enrollmentId ? { ...e, response, status: 'REPLIED' } : e),
    );
  }

  // ── Tab filtering ───────────────────────────────────────────────────────
  const currentTabStatuses = TABS.find((t) => t.key === activeTab)?.statuses ?? [];
  const tabFiltered = enrollments.filter((e) => currentTabStatuses.includes(e.status));

  const searchFiltered = tabFiltered.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.candidateName.toLowerCase().includes(q) || e.candidateEmail.toLowerCase().includes(q);
  });

  // ── Tab counts ──────────────────────────────────────────────────────────
  function tabCount(key: TabKey): number {
    const statuses = TABS.find((t) => t.key === key)?.statuses ?? [];
    return enrollments.filter((e) => statuses.includes(e.status)).length;
  }

  // ── Select helpers ──────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === searchFiltered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(searchFiltered.map((e) => e.id)));
    }
  }

  // ── Loading / error ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (error || !sequence) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle size={24} className="text-red-500" />
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{error || 'Sequence not found'}</p>
        <Button variant="secondary" size="sm" onClick={fetchSequence}>Try again</Button>
      </div>
    );
  }

  const allSelected = searchFiltered.length > 0 && selected.size === searchFiltered.length;

  return (
    <div className="p-8 flex-1 min-w-0">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mb-4">
        <Link href="/dashboard" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
        <span>•</span>
        <Link href="/sequences" className="hover:text-[var(--color-primary)] transition-colors">Sequences</Link>
      </nav>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <Mail size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <InlineName initialName={sequence.name} onSave={handleSaveName} />
              {sequence.isShared && (
                <span className="text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-full px-2 py-0.5">
                  Shared
                </span>
              )}
              <span className={[
                'text-[11px] font-medium rounded-full px-2 py-0.5 border',
                sequence.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200',
              ].join(' ')}>
                {sequence.status === 'ACTIVE' ? 'Active' : 'Paused'}
              </span>
            </div>
            {sequence.senderEmail && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Sender: {sequence.senderEmail}</p>
            )}
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="primary" size="sm">
            <Plus size={13} />
            Enroll
            {sequence.enrolledCount > 0 && (
              <span className="ml-1 bg-white/25 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                {sequence.enrolledCount}
              </span>
            )}
          </Button>
          <Link href={`/sequences/${id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil size={13} />
              Edit Template
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => setShowSettings(true)}>
            <Settings size={13} />
            Settings
          </Button>
          <MoreMenu
            sequence={sequence}
            onArchive={handleArchive}
            onDelete={() => setShowDelete(true)}
          />
        </div>
      </div>

      {/* ── Warning banner ───────────────────────────────────────────────── */}
      {linkedJob && (linkedJob as { status: string }).status === 'closed' && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            This sequence is linked to a closed job. Automations will be disabled until you update the linked job in Settings.
          </p>
        </div>
      )}

      {/* ── Stats + tabs layout ──────────────────────────────────────────── */}
      <div className="flex gap-6 mb-5">

        {/* ── Status tabs (left) ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-0.5 border-b border-[var(--color-border)]">
            {TABS.map((tab) => {
              const count  = tabCount(tab.key);
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSelected(new Set()); }}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                    active
                      ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-neutral-300',
                  ].join(' ')}
                >
                  {tab.label}
                  <span className={['text-[10px] tabular-nums', active ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]/60'].join(' ')}>
                    ({count})
                  </span>
                  <Tooltip text={tab.tooltip} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Stats (right) ──────────────────────────────────────────────── */}
        <div className="flex gap-3 flex-shrink-0">
          <StatBox
            label="Total Enrolled"
            value={sequence.stats.totalEnrolled}
          />
          <StatBox
            label="Open Rate"
            value={pct(sequence.stats.opens, sequence.stats.totalEnrolled)}
            sub={`${sequence.stats.opens} opens`}
          />
          <StatBox
            label="Click Rate"
            value={pct(sequence.stats.clicks, sequence.stats.totalEnrolled)}
            sub={`${sequence.stats.clicks} clicks`}
          />
          <StatBox
            label="Reply Rate"
            value={pct(sequence.stats.replied, sequence.stats.totalEnrolled)}
            sub={`${sequence.stats.replied} replies`}
          />
        </div>
      </div>

      {/* ── Bulk action bar ──────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-xl px-4 py-2.5 mb-3">
          <span className="text-sm font-medium text-[var(--color-primary)]">
            {selected.size} candidate{selected.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={handleBulkUnenroll} className="text-red-600 border-red-200 hover:bg-red-50">
            Unenroll selected
          </Button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            Clear
          </button>
        </div>
      )}

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="relative mb-3">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm w-64"
        />
      </div>

      {/* ── Candidates table ─────────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              <th className="w-10 px-4 py-3 text-left">
                <button onClick={toggleAll} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                  {allSelected
                    ? <CheckSquare size={14} className="text-[var(--color-primary)]" />
                    : <Square size={14} />
                  }
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Recipient</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Company / Position</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Stages</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Opens</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Clicks</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Response</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loadingEnroll ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : searchFiltered.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
                    <Mail size={20} className="text-[var(--color-text-muted)]" />
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {search ? 'No candidates match your search' : `No candidates in the ${TABS.find((t) => t.key === activeTab)?.label ?? ''} stage`}
                    </p>
                    {!search && activeTab === 'enrolled' && (
                      <p className="text-xs text-[var(--color-text-muted)]">Click "+ Enroll" to add candidates</p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              searchFiltered.map((enrollment) => {
                const isSelected = selected.has(enrollment.id);
                const status = STATUS_CONFIG[enrollment.status] ?? { label: enrollment.status, variant: 'default' as BadgeVariant, dot: 'bg-neutral-400' };
                return (
                  <tr
                    key={enrollment.id}
                    className={['transition-colors', isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface)]'].join(' ')}
                  >
                    {/* Checkbox */}
                    <td className="w-10 px-4 py-3.5">
                      <button onClick={() => toggleSelect(enrollment.id)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                        {isSelected
                          ? <CheckSquare size={14} className="text-[var(--color-primary)]" />
                          : <Square size={14} />
                        }
                      </button>
                    </td>

                    {/* Recipient */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={enrollment.candidateName} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--color-text-primary)] truncate text-sm">
                            {enrollment.candidateName}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">{enrollment.candidateEmail}</p>
                        </div>
                      </div>
                    </td>

                    {/* Company / Position */}
                    <td className="px-4 py-3.5">
                      {enrollment.candidateCurrentCompany ? (
                        <div>
                          <p className="text-sm text-[var(--color-text-primary)] font-medium">{enrollment.candidateCurrentCompany}</p>
                        </div>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      )}
                    </td>

                    {/* Stages completed */}
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {enrollment.currentStep} of {sequence.stepCount}
                      </p>
                      <button className="text-[11px] text-[var(--color-primary)] hover:underline flex items-center gap-0.5 mt-0.5">
                        View thread <ExternalLink size={9} />
                      </button>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <Badge variant={status.variant}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`} />
                        {status.label}
                      </Badge>
                    </td>

                    {/* Opens */}
                    <td className="px-4 py-3.5 text-right tabular-nums text-[var(--color-text-muted)] text-sm">
                      {enrollment.opens}
                    </td>

                    {/* Clicks */}
                    <td className="px-4 py-3.5 text-right tabular-nums text-[var(--color-text-muted)] text-sm">
                      {enrollment.clicks}
                    </td>

                    {/* Response */}
                    <td className="px-4 py-3.5">
                      <ResponseDropdown
                        enrollmentId={enrollment.id}
                        sequenceId={id}
                        currentResponse={enrollment.response}
                        onUpdated={handleResponseUpdated}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setUnenrollTarget(enrollment)}
                        className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Unenroll"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Row count footer */}
        {searchFiltered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]">
            {searchFiltered.length} candidate{searchFiltered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showSettings && (
        <SettingsPanel
          sequence={sequence}
          onClose={() => setShowSettings(false)}
          onSaved={handleSettingsSaved}
        />
      )}

      {showDelete && (
        <DeleteModal
          name={sequence.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {unenrollTarget && (
        <UnenrollModal
          name={unenrollTarget.candidateName}
          onConfirm={() => handleUnenroll(unenrollTarget)}
          onCancel={() => setUnenrollTarget(null)}
        />
      )}
    </div>
  );
}
