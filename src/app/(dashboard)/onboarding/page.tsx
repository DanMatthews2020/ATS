'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  ChevronRight,
  Check,
  Upload,
  Download,
  HelpCircle,
  Monitor,
  UserCheck,
  Users,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import { onboardingApi } from '@/lib/api';
import type { OnboardingSessionDto, OnboardingProfileDto } from '@/lib/api';
import type { BadgeVariant } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  label: string;
  checked: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: 'Your Profile' },
  { number: 2, label: 'Tasks' },
  { number: 3, label: 'Review' },
];

const TASK_META: Record<string, { priority: 'high' | 'medium' | 'low'; dueDate: string; group: 'it' | 'nh' | 'mg' }> = {
  it1: { priority: 'high',   dueDate: 'Day 1',   group: 'it' },
  it2: { priority: 'high',   dueDate: 'Day 1',   group: 'it' },
  it3: { priority: 'high',   dueDate: 'Day 1',   group: 'it' },
  it4: { priority: 'medium', dueDate: 'Day 2',   group: 'it' },
  it5: { priority: 'medium', dueDate: 'Day 2',   group: 'it' },
  it6: { priority: 'high',   dueDate: 'Day 3',   group: 'it' },
  nh1: { priority: 'high',   dueDate: 'Day 1',   group: 'nh' },
  nh2: { priority: 'high',   dueDate: 'Week 1',  group: 'nh' },
  nh3: { priority: 'high',   dueDate: 'Pre-start', group: 'nh' },
  nh4: { priority: 'medium', dueDate: 'Week 1',  group: 'nh' },
  nh5: { priority: 'medium', dueDate: 'Week 1',  group: 'nh' },
  nh6: { priority: 'high',   dueDate: 'Week 2',  group: 'nh' },
  mg1: { priority: 'high',   dueDate: 'Week 1',  group: 'mg' },
  mg2: { priority: 'medium', dueDate: 'Day 1',   group: 'mg' },
  mg3: { priority: 'medium', dueDate: 'Week 1',  group: 'mg' },
  mg4: { priority: 'high',   dueDate: 'Day 1',   group: 'mg' },
  mg5: { priority: 'medium', dueDate: 'Week 1',  group: 'mg' },
};

const TASK_LABELS: Record<string, string> = {
  it1: 'Set up laptop and workstation',
  it2: 'Create corporate email account',
  it3: 'Configure VPN access',
  it4: 'Set up Slack and communication tools',
  it5: 'Install required software and tools',
  it6: 'Enable two-factor authentication',
  nh1: 'Complete I-9 employment verification',
  nh2: 'Submit direct deposit information',
  nh3: 'Review and sign offer letter',
  nh4: 'Complete benefits enrollment',
  nh5: 'Review employee handbook',
  nh6: 'Complete mandatory compliance training',
  mg1: 'Schedule 30/60/90-day check-in meetings',
  mg2: 'Assign onboarding buddy',
  mg3: 'Arrange team introduction meetings',
  mg4: 'Define first-week goals and expectations',
  mg5: 'Schedule department overview sessions',
};

const RESOURCES = [
  { id: 'r1', title: 'Company Handbook', description: 'Quick guide to policies', href: '#' },
  { id: 'r2', title: 'Safety Training Module', description: '20 minutes', href: '#' },
  { id: 'r3', title: 'Benefits Overview', description: 'Health, PTO, 401(k)', href: '#' },
];

const PRIORITY_BADGE: Record<Task['priority'], BadgeVariant> = {
  high: 'error',
  medium: 'warning',
  low: 'default',
};

function tasksFromRecord(record: Record<string, boolean>): Record<string, Task> {
  const result: Record<string, Task> = {};
  for (const [id, checked] of Object.entries(record)) {
    const meta = TASK_META[id];
    if (!meta) continue;
    result[id] = { id, checked, label: TASK_LABELS[id] ?? id, priority: meta.priority, dueDate: meta.dueDate };
  }
  return result;
}

function tasksForGroup(all: Record<string, Task>, group: 'it' | 'nh' | 'mg'): Task[] {
  return Object.values(all).filter((t) => TASK_META[t.id]?.group === group);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // ── Server session state
  const [session, setSession] = useState<OnboardingSessionDto | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Local UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<Record<string, Task>>({});

  // ── Profile form
  const [form, setForm] = useState<OnboardingProfileDto>({
    fullName: '', pronouns: '', jobTitle: '', manager: '',
    startDate: '', workLocation: 'remote', workEmail: '', phone: '',
  });

  // ── Upload state
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);

  // ── Assistance modal
  const [assistanceOpen, setAssistanceOpen] = useState(false);
  const [assistanceMessage, setAssistanceMessage] = useState('');
  const [sendingAssistance, setSendingAssistance] = useState(false);

  // ── Activity
  const [activity, setActivity] = useState<{ text: string; time: string }[]>([]);

  // ── Load session on mount
  useEffect(() => {
    onboardingApi.getSession()
      .then(({ session: s }) => {
        setSession(s);
        setCurrentStep(s.step);
        setForm(s.profile);
        setTasks(tasksFromRecord(s.tasks));
        setActivity(s.activity);
      })
      .catch(() => showToast('Failed to load onboarding session', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  // ── Derived
  const profileCompletion = useMemo(() => {
    const values = Object.values(form);
    const filled = values.filter(Boolean).length;
    return Math.round((filled / values.length) * 100);
  }, [form]);

  const allTasks = useMemo(() => Object.values(tasks), [tasks]);
  const completedTasks = allTasks.filter((t) => t.checked).length;

  const documents = session?.documents ?? { resume: null, id: null };
  const docCount = (documents.resume ? 1 : 0) + (documents.id ? 1 : 0);

  // ── Handlers

  function updateForm(field: keyof OnboardingProfileDto, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const handleTaskToggle = useCallback(async (taskId: string) => {
    const current = tasks[taskId]?.checked ?? false;
    const next = !current;
    // Optimistic
    setTasks((prev) => ({ ...prev, [taskId]: { ...prev[taskId], checked: next } }));
    try {
      await onboardingApi.updateTask(taskId, next);
      // Refresh activity
      const { activity: act } = await onboardingApi.getActivity();
      setActivity(act);
    } catch {
      // Revert
      setTasks((prev) => ({ ...prev, [taskId]: { ...prev[taskId], checked: current } }));
      showToast('Failed to update task', 'error');
    }
  }, [tasks, showToast]);

  async function handleUpload(type: 'resume' | 'id', file: File) {
    const set = type === 'resume' ? setUploadingResume : setUploadingId;
    set(true);
    try {
      await onboardingApi.uploadDocument(type, file);
      const { session: s } = await onboardingApi.getSession();
      setSession(s);
      setActivity(s.activity);
      showToast(`${type === 'resume' ? 'Resume' : 'ID'} uploaded successfully`, 'success');
    } catch {
      showToast(`Failed to upload ${type === 'resume' ? 'resume' : 'ID'}`, 'error');
    } finally {
      set(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const { session: s } = await onboardingApi.saveProfile(form);
      setSession(s);
      setActivity(s.activity);
      setCurrentStep(2);
      showToast('Profile saved', 'success');
    } catch {
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTasks() {
    setSaving(true);
    try {
      const { session: s } = await onboardingApi.advanceToStep3();
      setSession(s);
      setActivity(s.activity);
      setCurrentStep(3);
    } catch {
      showToast('Failed to advance step', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      await onboardingApi.complete();
      showToast('Onboarding complete — welcome!', 'success');
      router.push('/dashboard');
    } catch {
      showToast('Failed to complete onboarding', 'error');
      setSaving(false);
    }
  }

  async function handleSkip() {
    try {
      const { session: s } = await onboardingApi.skip();
      setSession(s);
      setCurrentStep(Math.min(currentStep + 1, 3));
    } catch {
      showToast('Failed to skip step', 'error');
    }
  }

  async function handleSendAssistance() {
    if (!assistanceMessage.trim()) return;
    setSendingAssistance(true);
    try {
      await onboardingApi.requestAssistance(assistanceMessage.trim());
      showToast('Assistance request sent to HR', 'success');
      setAssistanceOpen(false);
      setAssistanceMessage('');
      const { activity: act } = await onboardingApi.getActivity();
      setActivity(act);
    } catch {
      showToast('Failed to send request', 'error');
    } finally {
      setSendingAssistance(false);
    }
  }

  function handleDownloadSummary() {
    if (!session) return;
    const lines = [
      'ONBOARDING SUMMARY',
      '==================',
      '',
      'PROFILE',
      `Full Name: ${form.fullName}`,
      `Job Title: ${form.jobTitle}`,
      `Manager: ${form.manager || '—'}`,
      `Start Date: ${form.startDate || '—'}`,
      `Work Location: ${form.workLocation}`,
      `Work Email: ${form.workEmail}`,
      `Phone: ${form.phone}`,
      '',
      'TASKS',
      `Completed: ${completedTasks} / ${allTasks.length}`,
      ...allTasks.map((t) => `  [${t.checked ? 'x' : ' '}] ${t.label}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'onboarding-summary.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleContinue() {
    if (currentStep === 1) handleSaveProfile();
    else if (currentStep === 2) handleSaveTasks();
    else handleComplete();
  }

  // ── Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] px-8 py-8">
        <div className="h-8 w-48 bg-[var(--color-border)] rounded-xl animate-pulse mb-6" />
        <div className="h-64 bg-[var(--color-border)] rounded-2xl animate-pulse" />
      </div>
    );
  }

  const itTasks  = tasksForGroup(tasks, 'it');
  const nhTasks  = tasksForGroup(tasks, 'nh');
  const mgTasks  = tasksForGroup(tasks, 'mg');

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="px-8 py-8">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
              <ClipboardList size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
                Onboarding
              </h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                Get started with your TeamTalent account
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Step{' '}
            <span className="font-semibold text-[var(--color-text-primary)]">{currentStep}</span>
            {' '}of 3
          </p>
        </div>

        <p className="text-sm text-[var(--color-text-muted)] mb-6 ml-[3.375rem]">
          Complete these quick steps to finish onboarding and access all features.
        </p>

        {/* ── Step tabs ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((step, i) => {
            const isDone = currentStep > step.number;
            const isActive = currentStep === step.number;
            return (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.number)}
                  className={[
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-muted)] hover:bg-white hover:text-[var(--color-text-primary)]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                      isActive
                        ? 'bg-white text-[var(--color-primary)]'
                        : isDone
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--color-border)] text-[var(--color-text-muted)]',
                    ].join(' ')}
                  >
                    {isDone ? <Check size={10} strokeWidth={3} /> : step.number}
                  </span>
                  {step.label}
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={14} className="text-[var(--color-border)] mx-0.5" />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Profile Completion"
            value={`${profileCompletion}%`}
            sub="Fill in all fields"
            color={profileCompletion >= 80 ? 'text-emerald-600' : 'text-amber-600'}
          />
          <StatCard
            label="Documents Uploaded"
            value={`${docCount} / 2`}
            sub={docCount === 2 ? 'All uploaded' : 'Resume, ID'}
            color={docCount === 2 ? 'text-emerald-600' : 'text-amber-600'}
          />
          <StatCard
            label="Tasks Completed"
            value={`${completedTasks} / ${allTasks.length}`}
            sub={completedTasks === allTasks.length ? 'All done!' : 'Keep going'}
            color={completedTasks === allTasks.length ? 'text-emerald-600' : 'text-[var(--color-text-primary)]'}
          />
          <StatCard
            label="Profile Verified"
            value={session?.completed ? 'Verified' : 'Pending'}
            sub={session?.completed ? 'Complete' : 'Verify identity'}
            color={session?.completed ? 'text-emerald-600' : 'text-amber-600'}
          />
        </div>

        {/* ── Two-column layout ───────────────────────────────────────────── */}
        <div className="flex gap-6 items-start">

          {/* Left column — step content */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Step 1: Profile */}
            {currentStep === 1 && (
              <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-5">
                  Complete your profile
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Full name"
                      placeholder="Alexandra Martinez"
                      value={form.fullName}
                      onChange={(e) => updateForm('fullName', e.target.value)}
                    />
                    <Input
                      label="Preferred pronouns"
                      placeholder="She/Her"
                      value={form.pronouns}
                      onChange={(e) => updateForm('pronouns', e.target.value)}
                    />
                  </div>
                  <Input
                    label="Job title"
                    placeholder="Senior Talent Sourcer"
                    value={form.jobTitle}
                    onChange={(e) => updateForm('jobTitle', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Manager"
                      placeholder="e.g. John Smith"
                      value={form.manager}
                      onChange={(e) => updateForm('manager', e.target.value)}
                    />
                    <Input
                      label="Start date"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => updateForm('startDate', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Work email"
                      type="email"
                      placeholder="alex@company.com"
                      value={form.workEmail}
                      onChange={(e) => updateForm('workEmail', e.target.value)}
                    />
                    <Input
                      label="Phone"
                      type="tel"
                      placeholder="+1 (415) 555-0132"
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                    />
                  </div>

                  {/* Work location */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="work-location" className="text-sm font-medium text-[var(--color-text-primary)]">
                      Work location
                    </label>
                    <div className="flex gap-2">
                      {(['remote', 'onsite', 'hybrid'] as const).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => updateForm('workLocation', loc)}
                          className={[
                            'px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
                            form.workLocation === loc
                              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                              : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-neutral-300',
                          ].join(' ')}
                        >
                          {loc === 'onsite' ? 'On-site' : loc.charAt(0).toUpperCase() + loc.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Document uploads */}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      Upload documents{' '}
                      <span className="font-normal text-[var(--color-text-muted)]">(Resume, ID)</span>
                    </p>
                    <div className="flex gap-3">
                      <input
                        ref={resumeInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload('resume', f); }}
                      />
                      <Button
                        variant={documents.resume ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => resumeInputRef.current?.click()}
                        disabled={uploadingResume}
                      >
                        <Upload size={13} />
                        {uploadingResume ? 'Uploading…' : documents.resume ? `✓ ${documents.resume.filename}` : 'Upload Resume'}
                      </Button>
                      <input
                        ref={idInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload('id', f); }}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => idInputRef.current?.click()}
                        disabled={uploadingId}
                      >
                        <Upload size={13} />
                        {uploadingId ? 'Uploading…' : documents.id ? `✓ ${documents.id.filename}` : 'Upload ID'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Tasks */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <TaskSection
                  icon={<Monitor size={15} />}
                  title="IT Tasks"
                  description="IT setup to be completed before or on your first day"
                  tasks={itTasks}
                  onToggle={handleTaskToggle}
                  countColor="bg-blue-50 text-blue-700"
                />
                <TaskSection
                  icon={<UserCheck size={15} />}
                  title="New Hire Tasks"
                  description="Required documentation and training for new employees"
                  tasks={nhTasks}
                  onToggle={handleTaskToggle}
                  countColor="bg-violet-50 text-violet-700"
                />
                <TaskSection
                  icon={<Users size={15} />}
                  title="Manager Tasks"
                  description="Items your manager needs to complete to set you up for success"
                  tasks={mgTasks}
                  onToggle={handleTaskToggle}
                  countColor="bg-amber-50 text-amber-700"
                />
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {/* Profile summary */}
                <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Profile summary</h2>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-[var(--color-primary)] hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { label: 'Full name',      value: form.fullName || '—' },
                      { label: 'Pronouns',       value: form.pronouns || '—' },
                      { label: 'Job title',      value: form.jobTitle || '—' },
                      { label: 'Manager',        value: form.manager || '—' },
                      { label: 'Start date',     value: form.startDate || '—' },
                      { label: 'Work location',  value: { remote: 'Remote', onsite: 'On-site', hybrid: 'Hybrid' }[form.workLocation] ?? form.workLocation },
                      { label: 'Work email',     value: form.workEmail || '—' },
                      { label: 'Phone',          value: form.phone || '—' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                          {label}
                        </p>
                        <p className="text-sm text-[var(--color-text-primary)] mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task progress summary */}
                <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Task progress</h2>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-[var(--color-primary)] hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'IT Tasks',       tasks: itTasks },
                      { label: 'New Hire Tasks', tasks: nhTasks },
                      { label: 'Manager Tasks',  tasks: mgTasks },
                    ].map(({ label, tasks: grpTasks }) => {
                      const done = grpTasks.filter((t) => t.checked).length;
                      const pct = grpTasks.length ? Math.round((done / grpTasks.length) * 100) : 0;
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-[var(--color-text-primary)]">{label}</span>
                            <span className="text-xs text-[var(--color-text-muted)]">{done} / {grpTasks.length}</span>
                          </div>
                          <div className="h-1.5 bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Footer actions ─────────────────────────────────────────── */}
            <div className="bg-white border border-[var(--color-border)] rounded-2xl px-6 py-4 shadow-card">
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--color-text-muted)]">Progress</span>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                      {profileCompletion}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2.5 flex-shrink-0">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setCurrentStep((s) => s - 1)}
                    disabled={currentStep === 1}
                  >
                    Back
                  </Button>
                  <Button variant="primary" size="md" onClick={handleContinue} disabled={saving}>
                    {saving ? 'Saving…' : currentStep === 3 ? 'Complete Onboarding' : 'Save & Continue'}
                    {!saving && <ChevronRight size={14} />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
                <Button variant="ghost" size="sm" onClick={handleDownloadSummary}>
                  <Download size={13} />
                  Download Summary
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAssistanceOpen(true)}>
                  <HelpCircle size={13} />
                  Request Assistance
                </Button>
                {currentStep < 3 && (
                  <button
                    className="ml-auto text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    onClick={handleSkip}
                  >
                    Skip for now →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Right sidebar ──────────────────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 space-y-4">

            {/* Helpful resources */}
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                Helpful resources
              </h3>
              <ul className="space-y-2">
                {RESOURCES.map((res) => (
                  <li key={res.id}>
                    <a
                      href={res.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-[var(--color-border)] hover:border-neutral-300 hover:shadow-card transition-all group flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-black">
                          {res.title}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{res.description}</p>
                      </div>
                      <ExternalLink size={12} className="text-[var(--color-text-muted)] mt-0.5 flex-shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent activity */}
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                Recent activity
              </h3>
              {activity.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">No activity yet</p>
              ) : (
                <ul className="space-y-3">
                  {activity.slice(0, 8).map(({ text, time }, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-[var(--color-text-primary)]">{text}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{time}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Request Assistance Modal ─────────────────────────────────────────── */}
      {assistanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setAssistanceOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Request HR Assistance
              </h2>
              <button
                onClick={() => setAssistanceOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Describe what you need help with and our HR team will get back to you shortly.
            </p>
            <textarea
              className="w-full h-32 px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] transition-colors"
              placeholder="e.g. I need help with benefits enrollment…"
              value={assistanceMessage}
              onChange={(e) => setAssistanceMessage(e.target.value)}
            />
            <div className="flex justify-end gap-2.5 mt-4">
              <Button variant="secondary" size="md" onClick={() => setAssistanceOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSendAssistance}
                disabled={!assistanceMessage.trim() || sendingAssistance}
              >
                {sendingAssistance ? 'Sending…' : 'Send Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-card">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className={['text-2xl font-bold leading-tight', color].join(' ')}>{value}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>
    </div>
  );
}

function TaskSection({
  icon,
  title,
  description,
  tasks,
  onToggle,
  countColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  countColor: string;
}) {
  const done = tasks.filter((t) => t.checked).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <span className="text-[var(--color-text-muted)]">{icon}</span>
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
          </div>
        </div>
        <span className={['text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0', countColor].join(' ')}>
          {done} / {tasks.length}
        </span>
      </div>

      <div className="h-1 bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] overflow-hidden my-4">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="space-y-3">
        {tasks.map((task) => (
          <li key={task.id}>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={task.checked}
                onChange={() => onToggle(task.id)}
                className="w-4 h-4 rounded border-[var(--color-border)] accent-black cursor-pointer flex-shrink-0"
              />
              <span
                className={[
                  'flex-1 text-sm transition-colors',
                  task.checked
                    ? 'line-through text-[var(--color-text-muted)]'
                    : 'text-[var(--color-text-primary)]',
                ].join(' ')}
              >
                {task.label}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-[var(--color-text-muted)]">{task.dueDate}</span>
                <Badge variant={PRIORITY_BADGE[task.priority]}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
              </div>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
