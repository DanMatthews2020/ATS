'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft, Play, Pause, Loader2, Plus, Trash2,
  Mail, Clock, CheckSquare, Users, GripVertical, X, Check,
  UserPlus, GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import {
  sequencesApi, emailTemplatesApi, candidatesApi,
  type SequenceDetailDto as SequenceDto, type SequenceStepDto, type EmailTemplateDto,
  type EnrollmentDto as SequenceEnrollmentDto,
} from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'builder' | 'enrolled' | 'settings';
type StepType = 'EMAIL' | 'WAIT' | 'TASK';

// ─── Step type meta ───────────────────────────────────────────────────────────

const STEP_TYPES: { value: StepType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'EMAIL', label: 'Send Email',   icon: <Mail size={14} />,        color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'WAIT',  label: 'Wait',         icon: <Clock size={14} />,       color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'TASK',  label: 'Manual Task',  icon: <CheckSquare size={14} />, color: 'text-green-600 bg-green-50 border-green-200' },
];

function stepMeta(type: StepType) {
  return STEP_TYPES.find((t) => t.value === type)!;
}

// ─── Add Step Modal ───────────────────────────────────────────────────────────

function AddStepModal({ sequenceId, templates, onSaved, onCancel }: {
  sequenceId: string;
  templates: EmailTemplateDto[];
  onSaved: (step: SequenceStepDto) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [type, setType] = useState<StepType>('EMAIL');
  const [templateId, setTemplateId] = useState('');
  const [waitDays, setWaitDays] = useState(1);
  const [taskDescription, setTaskDescription] = useState('');
  const [sendTime, setSendTime] = useState('09:00');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (type === 'EMAIL' && !templateId) { showToast('Select an email template', 'error'); return; }
    if (type === 'TASK' && !taskDescription.trim()) { showToast('Task description is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await sequencesApi.addStep(sequenceId, {
        type,
        templateId:      type === 'EMAIL' ? templateId : undefined,
        waitDays:        type === 'WAIT'  ? waitDays   : undefined,
        taskDescription: type === 'TASK'  ? taskDescription.trim() : undefined,
        sendTime:        type === 'EMAIL' ? sendTime : undefined,
      });
      onSaved(res.step);
      showToast('Step added', 'success');
    } catch {
      showToast('Failed to add step', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Add Step</h3>
          <button onClick={onCancel} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface)]">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">Step Type</label>
            <div className="grid grid-cols-3 gap-2">
              {STEP_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                    type === t.value
                      ? `${t.color} ring-2 ring-offset-1 ring-[var(--color-primary)]/40`
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* EMAIL fields */}
          {type === 'EMAIL' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Email Template <span className="text-red-500">*</span></label>
                {templates.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
                    No templates yet.{' '}
                    <Link href="/settings/email-templates" className="text-[var(--color-primary)] underline">Create one first.</Link>
                  </p>
                ) : (
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl bg-white text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  >
                    <option value="">Select a template…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Send Time</label>
                <input
                  type="time"
                  value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                />
              </div>
            </>
          )}

          {/* WAIT fields */}
          {type === 'WAIT' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Wait Duration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={waitDays}
                  onChange={(e) => setWaitDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                />
                <span className="text-sm text-[var(--color-text-muted)]">day{waitDays !== 1 ? 's' : ''} before next step</span>
              </div>
            </div>
          )}

          {/* TASK fields */}
          {type === 'TASK' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Task Description <span className="text-red-500">*</span></label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                rows={3}
                placeholder="e.g. Call candidate to discuss the role…"
                className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-xl resize-none outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" isLoading={saving} onClick={handleSave}>Add Step</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Enroll Modal ─────────────────────────────────────────────────────────────

function EnrollModal({ sequenceId, enrolledIds, onEnrolled, onCancel }: {
  sequenceId: string;
  enrolledIds: Set<string>;
  onEnrolled: (enrollment: SequenceEnrollmentDto) => void;
  onCancel: () => void;
}) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await candidatesApi.getCandidates(1, 10, query);
        setResults(d.items.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email ?? '',
        })));
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function handleEnroll(candidateId: string) {
    setEnrollingId(candidateId);
    try {
      const res = await sequencesApi.enroll(sequenceId, { candidateId });
      onEnrolled(res.enrollment);
      showToast('Candidate enrolled', 'success');
    } catch {
      showToast('Failed to enroll candidate', 'error');
    } finally {
      setEnrollingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--color-border)]">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Enroll Candidate</h3>
          <button onClick={onCancel} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface)]">
            <X size={14} />
          </button>
        </div>
        <div className="p-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates by name or email…"
            autoFocus
            className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 mb-3"
          />
          <div className="min-h-[120px] max-h-64 overflow-y-auto space-y-1">
            {searching && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin text-[var(--color-text-muted)]" />
              </div>
            )}
            {!searching && query && results.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-6">No candidates found</p>
            )}
            {!searching && !query && (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-6">Type to search candidates</p>
            )}
            {results.map((c) => {
              const already = enrolledIds.has(c.id);
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[var(--color-surface)] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{c.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{c.email}</p>
                  </div>
                  {already ? (
                    <span className="text-xs text-green-600 flex items-center gap-1"><Check size={11} /> Enrolled</span>
                  ) : (
                    <button
                      onClick={() => handleEnroll(c.id)}
                      disabled={enrollingId === c.id}
                      className="text-xs text-[var(--color-primary)] font-medium px-2.5 py-1 rounded-lg border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 transition-colors disabled:opacity-50"
                    >
                      {enrollingId === c.id ? <Loader2 size={11} className="animate-spin" /> : 'Enroll'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end px-5 pb-5">
          <Button variant="secondary" size="sm" onClick={onCancel}>Done</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({ step, position, onDelete }: {
  step: SequenceStepDto;
  position: number;
  onDelete: () => void;
}) {
  const meta = stepMeta(step.type as StepType);

  return (
    <div className="flex items-start gap-3">
      {/* connector line + number */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xs font-semibold text-[var(--color-text-muted)]">
          {position}
        </div>
        <div className="w-px flex-1 min-h-[24px] bg-[var(--color-border)] mt-1" />
      </div>

      {/* card */}
      <div className="flex-1 mb-2 group border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-primary)] hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border ${meta.color}`}>
              {meta.icon}
              {meta.label}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={13} className="text-[var(--color-text-muted)] cursor-grab" />
            <button
              onClick={onDelete}
              className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        <div className="mt-2 text-sm text-[var(--color-text-primary)]">
          {step.type === 'EMAIL' && (
            <p>
              {step.templateName
                ? <><span className="font-medium">{step.templateName}</span>{step.sendTime ? ` · ${step.sendTime}` : ''}</>
                : <span className="text-[var(--color-text-muted)] italic">No template selected</span>
              }
            </p>
          )}
          {step.type === 'WAIT' && (
            <p className="text-[var(--color-text-muted)]">Wait <span className="font-medium text-[var(--color-text-primary)]">{step.waitDays ?? 1} day{(step.waitDays ?? 1) !== 1 ? 's' : ''}</span></p>
          )}
          {step.type === 'TASK' && (
            <p className="text-[var(--color-text-muted)]">{step.taskDescription}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({ sequence, onUpdated }: { sequence: SequenceDto; onUpdated: (s: SequenceDto) => void }) {
  const { showToast } = useToast();
  const [name, setName] = useState(sequence.name);
  const [stopOnReply, setStopOnReply] = useState(sequence.stopOnReply);
  const [stopOnInterview, setStopOnInterview] = useState(sequence.stopOnInterview);
  const [maxEmails, setMaxEmails] = useState(sequence.maxEmails);
  const [saving, setSaving] = useState(false);

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DAY_VALUES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const [sendingDays, setSendingDays] = useState<string[]>(sequence.sendingDays);

  function toggleDay(val: string) {
    setSendingDays((prev) => prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]);
  }

  async function handleSave() {
    if (!name.trim()) { showToast('Sequence name is required', 'error'); return; }
    setSaving(true);
    try {
      const res = await sequencesApi.update(sequence.id, { name: name.trim(), stopOnReply, stopOnInterview, maxEmails, sendingDays });
      onUpdated({ ...sequence, ...res.sequence });
      showToast('Settings saved', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Sequence Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2">Sending Days</label>
        <div className="flex gap-1.5">
          {DAYS.map((day, i) => {
            const val = DAY_VALUES[i];
            const active = sendingDays.includes(val);
            return (
              <button
                key={val}
                onClick={() => toggleDay(val)}
                className={`w-9 h-9 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Max Emails per Candidate</label>
        <input
          type="number"
          min={1}
          max={50}
          value={maxEmails}
          onChange={(e) => setMaxEmails(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-28 h-10 px-3 text-sm border border-[var(--color-border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-medium text-[var(--color-text-muted)]">Stopping Rules</label>
        {[
          { key: 'stopOnReply', label: 'Stop when candidate replies', value: stopOnReply, set: setStopOnReply },
          { key: 'stopOnInterview', label: 'Stop when interview is booked', value: stopOnInterview, set: setStopOnInterview },
        ].map((item) => (
          <label key={item.key} className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => item.set(!item.value)}
              className={`w-9 h-5 rounded-full transition-colors relative ${item.value ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${item.value ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-[var(--color-text-primary)]">{item.label}</span>
          </label>
        ))}
      </div>

      <Button variant="primary" size="sm" isLoading={saving} onClick={handleSave}>Save Settings</Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SequenceBuilderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { id } = params;

  const [sequence, setSequence] = useState<SequenceDto | null>(null);
  const [templates, setTemplates] = useState<EmailTemplateDto[]>([]);
  const [enrollments, setEnrollments] = useState<SequenceEnrollmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('builder');
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [seqRes, tplRes] = await Promise.all([
        sequencesApi.getById(id),
        emailTemplatesApi.getAll(),
      ]);
      setSequence(seqRes.sequence);
      setTemplates(tplRes.templates);
    } catch {
      showToast('Failed to load sequence', 'error');
      router.push('/settings/sequences');
    } finally {
      setLoading(false);
    }
  }, [id, router, showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab !== 'enrolled') return;
    sequencesApi.getEnrollments(id)
      .then((d) => setEnrollments(d.enrollments))
      .catch(() => showToast('Failed to load enrollments', 'error'));
  }, [tab, id, showToast]);

  async function handleToggleStatus() {
    if (!sequence) return;
    const next = sequence.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setTogglingStatus(true);
    try {
      const res = await sequencesApi.toggleStatus(id, next);
      setSequence((prev) => prev ? { ...prev, ...res.sequence } : prev);
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleDeleteStep(stepId: string) {
    setDeletingStepId(stepId);
    try {
      await sequencesApi.deleteStep(id, stepId);
      setSequence((prev) => prev ? { ...prev, steps: prev.steps.filter((s) => s.id !== stepId), stepCount: prev.stepCount - 1 } : prev);
      showToast('Step removed', 'success');
    } catch {
      showToast('Failed to remove step', 'error');
    } finally {
      setDeletingStepId(null);
    }
  }

  async function handleUnenroll(candidateId: string) {
    setUnenrollingId(candidateId);
    try {
      await sequencesApi.unenroll(id, candidateId);
      setEnrollments((prev) => prev.filter((e) => e.candidateId !== candidateId));
      setSequence((prev) => prev ? { ...prev, enrolledCount: prev.enrolledCount - 1 } : prev);
      showToast('Candidate unenrolled', 'success');
    } catch {
      showToast('Failed to unenroll candidate', 'error');
    } finally {
      setUnenrollingId(null);
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const enrolledIds = new Set(enrollments.map((e) => e.candidateId));

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE:    'bg-green-50 text-green-700 border-green-200',
    COMPLETED: 'bg-blue-50 text-blue-700 border-blue-200',
    STOPPED:   'bg-neutral-50 text-neutral-500 border-neutral-200',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (!sequence) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/settings/sequences" className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-6 transition-colors">
        <ChevronLeft size={13} /> Back to Sequences
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Mail size={18} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{sequence.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${sequence.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-neutral-50 text-neutral-500 border-neutral-200'}`}>
                {sequence.status === 'ACTIVE' ? 'Active' : 'Paused'}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">{sequence.stepCount} step{sequence.stepCount !== 1 ? 's' : ''}</span>
              <span className="text-xs text-[var(--color-text-muted)]">·</span>
              <span className="text-xs text-[var(--color-text-muted)]">{sequence.enrolledCount} enrolled</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            isLoading={togglingStatus}
            onClick={handleToggleStatus}
          >
            {sequence.status === 'ACTIVE' ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Activate</>}
          </Button>
          {tab === 'builder' && (
            <Button variant="primary" size="sm" onClick={() => setAddStepOpen(true)}>
              <Plus size={14} /> Add Step
            </Button>
          )}
          {tab === 'enrolled' && (
            <Button variant="primary" size="sm" onClick={() => setEnrollOpen(true)}>
              <UserPlus size={14} /> Enroll Candidate
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)] mb-6">
        {(['builder', 'enrolled', 'settings'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {t === 'enrolled' ? `Enrolled (${sequence.enrolledCount})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Builder tab */}
      {tab === 'builder' && (
        <div>
          {sequence.steps.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-[var(--color-border)] rounded-2xl">
              <GitBranch size={32} className="text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">No steps yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-5">Add email, wait, or task steps to build your outreach sequence.</p>
              <Button variant="primary" size="sm" onClick={() => setAddStepOpen(true)}>
                <Plus size={13} /> Add First Step
              </Button>
            </div>
          ) : (
            <div>
              {sequence.steps
                .sort((a, b) => a.position - b.position)
                .map((step, idx) => (
                  <div key={step.id} className={deletingStepId === step.id ? 'opacity-50 pointer-events-none' : ''}>
                    <StepCard
                      step={step}
                      position={idx + 1}
                      onDelete={() => handleDeleteStep(step.id)}
                    />
                  </div>
                ))}
              {/* End node */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                    <Check size={12} className="text-green-600" />
                  </div>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">Sequence complete</span>
              </div>
              <div className="mt-6">
                <Button variant="secondary" size="sm" onClick={() => setAddStepOpen(true)}>
                  <Plus size={13} /> Add Step
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enrolled tab */}
      {tab === 'enrolled' && (
        <div>
          {enrollments.length === 0 ? (
            <div className="text-center py-16">
              <Users size={32} className="text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">No candidates enrolled</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-5">Enroll candidates to start sending them through this sequence.</p>
              <Button variant="primary" size="sm" onClick={() => setEnrollOpen(true)}>
                <UserPlus size={13} /> Enroll Candidate
              </Button>
            </div>
          ) : (
            <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                    <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-muted)]">Candidate</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Step</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)]">Enrolled</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="group hover:bg-[var(--color-surface)] transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-[var(--color-text-primary)]">{e.candidateName}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{e.candidateEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">Step {e.currentStep + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[e.status] ?? ''}`}>
                          {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">{fmtDate(e.enrolledAt)}</td>
                      <td className="px-4 py-3">
                        {e.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleUnenroll(e.candidateId)}
                            disabled={unenrollingId === e.candidateId}
                            className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:underline transition-opacity disabled:opacity-50"
                          >
                            {unenrollingId === e.candidateId ? <Loader2 size={11} className="animate-spin" /> : 'Unenroll'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings tab */}
      {tab === 'settings' && (
        <SettingsPanel sequence={sequence} onUpdated={(s) => setSequence(s)} />
      )}

      {/* Modals */}
      {addStepOpen && sequence && (
        <AddStepModal
          sequenceId={id}
          templates={templates}
          onSaved={(step) => {
            setSequence((prev) => prev ? { ...prev, steps: [...prev.steps, step], stepCount: prev.stepCount + 1 } : prev);
            setAddStepOpen(false);
          }}
          onCancel={() => setAddStepOpen(false)}
        />
      )}

      {enrollOpen && (
        <EnrollModal
          sequenceId={id}
          enrolledIds={enrolledIds}
          onEnrolled={(enrollment) => {
            setEnrollments((prev) => [...prev, enrollment]);
            setSequence((prev) => prev ? { ...prev, enrolledCount: prev.enrolledCount + 1 } : prev);
          }}
          onCancel={() => setEnrollOpen(false)}
        />
      )}
    </div>
  );
}

