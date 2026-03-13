'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
}

interface Task extends CheckItem {
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: 'Your Profile' },
  { number: 2, label: 'Tasks' },
  { number: 3, label: 'Review' },
];

const INITIAL_CHECKLIST: CheckItem[] = [
  { id: 'cl1', label: 'Upload resume', checked: false },
  { id: 'cl2', label: 'Verify identity', checked: false },
  { id: 'cl3', label: 'Complete safety training', checked: false },
  { id: 'cl4', label: 'Read company handbook', checked: false },
];

const INITIAL_IT_TASKS: Task[] = [
  { id: 'it1', label: 'Set up laptop and workstation', checked: false, priority: 'high', dueDate: 'Day 1' },
  { id: 'it2', label: 'Create corporate email account', checked: true, priority: 'high', dueDate: 'Day 1' },
  { id: 'it3', label: 'Configure VPN access', checked: false, priority: 'high', dueDate: 'Day 1' },
  { id: 'it4', label: 'Set up Slack and communication tools', checked: true, priority: 'medium', dueDate: 'Day 2' },
  { id: 'it5', label: 'Install required software and tools', checked: false, priority: 'medium', dueDate: 'Day 2' },
  { id: 'it6', label: 'Enable two-factor authentication', checked: false, priority: 'high', dueDate: 'Day 3' },
];

const INITIAL_HIRE_TASKS: Task[] = [
  { id: 'nh1', label: 'Complete I-9 employment verification', checked: false, priority: 'high', dueDate: 'Day 1' },
  { id: 'nh2', label: 'Submit direct deposit information', checked: false, priority: 'high', dueDate: 'Week 1' },
  { id: 'nh3', label: 'Review and sign offer letter', checked: true, priority: 'high', dueDate: 'Pre-start' },
  { id: 'nh4', label: 'Complete benefits enrollment', checked: false, priority: 'medium', dueDate: 'Week 1' },
  { id: 'nh5', label: 'Review employee handbook', checked: false, priority: 'medium', dueDate: 'Week 1' },
  { id: 'nh6', label: 'Complete mandatory compliance training', checked: false, priority: 'high', dueDate: 'Week 2' },
];

const INITIAL_MANAGER_TASKS: Task[] = [
  { id: 'mg1', label: 'Schedule 30/60/90-day check-in meetings', checked: false, priority: 'high', dueDate: 'Week 1' },
  { id: 'mg2', label: 'Assign onboarding buddy', checked: true, priority: 'medium', dueDate: 'Day 1' },
  { id: 'mg3', label: 'Arrange team introduction meetings', checked: true, priority: 'medium', dueDate: 'Week 1' },
  { id: 'mg4', label: 'Define first-week goals and expectations', checked: false, priority: 'high', dueDate: 'Day 1' },
  { id: 'mg5', label: 'Schedule department overview sessions', checked: false, priority: 'medium', dueDate: 'Week 1' },
];

const RESOURCES = [
  { id: 'r1', title: 'Company Handbook', description: 'Quick guide to policies' },
  { id: 'r2', title: 'Safety Training Module', description: '20 minutes' },
  { id: 'r3', title: 'Benefits Overview', description: 'Health, PTO, 401(k)' },
];

const RECENT_ACTIVITY = [
  { text: 'Corporate email created', time: 'Day 1' },
  { text: 'Slack workspace joined', time: 'Day 1' },
  { text: 'Offer letter signed', time: 'Pre-start' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isComplete, setIsComplete] = useState(false);

  // Checklist & task state
  const [checklist, setChecklist] = useState<CheckItem[]>(INITIAL_CHECKLIST);
  const [itTasks, setItTasks] = useState<Task[]>(INITIAL_IT_TASKS);
  const [hireTasks, setHireTasks] = useState<Task[]>(INITIAL_HIRE_TASKS);
  const [managerTasks, setManagerTasks] = useState<Task[]>(INITIAL_MANAGER_TASKS);

  // Profile form state
  const [form, setForm] = useState({
    fullName: 'Alexandra Martinez',
    pronouns: 'She/Her',
    jobTitle: 'Senior Talent Sourcer',
    manager: '',
    startDate: '',
    workLocation: 'remote',
    workEmail: 'alex.martinez@teamtalent.com',
    phone: '+1 (415) 555-0132',
  });

  // ── Derived stats ────────────────────────────────────────────────────────────

  const profileCompletion = useMemo(() => {
    const filled = Object.values(form).filter(Boolean).length;
    return Math.round((filled / Object.keys(form).length) * 100);
  }, [form]);

  const allTasks = useMemo(
    () => [...itTasks, ...hireTasks, ...managerTasks],
    [itTasks, hireTasks, managerTasks],
  );
  const completedTasks = allTasks.filter((t) => t.checked).length;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function updateForm(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleChecklist(id: string) {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    );
  }

  function toggleItTask(id: string) {
    setItTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)),
    );
  }
  function toggleHireTask(id: string) {
    setHireTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)),
    );
  }
  function toggleManagerTask(id: string) {
    setManagerTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)),
    );
  }

  function handleContinue() {
    if (currentStep < 3) {
      setCurrentStep((s) => s + 1);
    } else {
      setIsComplete(true);
    }
  }

  function handleBack() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <div className="px-8 py-8">

        {/* ── Page header ───────────────────────────────────────────────── */}
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
            <span className="font-semibold text-[var(--color-text-primary)]">
              {currentStep}
            </span>{' '}
            of 3
          </p>
        </div>

        <p className="text-sm text-[var(--color-text-muted)] mb-6 ml-[3.375rem]">
          Complete these quick steps to finish onboarding and access all features.
        </p>

        {/* ── Step tabs ─────────────────────────────────────────────────── */}
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

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <OnboardingStatCard
            label="Profile Completion"
            value={`${profileCompletion}%`}
            sub="Add photo, documents"
            color={profileCompletion >= 80 ? 'text-emerald-600' : 'text-amber-600'}
          />
          <OnboardingStatCard
            label="Documents Uploaded"
            value="2 / 5"
            sub="Passport, Resume"
            color="text-amber-600"
          />
          <OnboardingStatCard
            label="Tasks Completed"
            value={`${completedTasks} / ${allTasks.length}`}
            sub={completedTasks === allTasks.length ? 'All done!' : 'Keep going'}
            color={completedTasks === allTasks.length ? 'text-emerald-600' : 'text-[var(--color-text-primary)]'}
          />
          <OnboardingStatCard
            label="Profile Verified"
            value="Pending"
            sub="Verify identity"
            color="text-amber-600"
          />
        </div>

        {/* ── Main two-column layout ─────────────────────────────────────── */}
        <div className="flex gap-6 items-start">

          {/* Left column — step content */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Step 1: Profile form */}
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
                      placeholder="alex.martinez@teamtalent.com"
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

                  {/* Work location — custom select matching app style */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="work-location"
                      className="text-sm font-medium text-[var(--color-text-primary)]"
                    >
                      Work location
                    </label>
                    <select
                      id="work-location"
                      value={form.workLocation}
                      onChange={(e) => updateForm('workLocation', e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-[var(--color-border)] bg-white text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer"
                    >
                      <option value="remote">Remote</option>
                      <option value="onsite">On-site</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  {/* Document uploads */}
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      Upload documents{' '}
                      <span className="font-normal text-[var(--color-text-muted)]">
                        (Resume, ID)
                      </span>
                    </p>
                    <div className="flex gap-3">
                      <Button variant="primary" size="sm">
                        <Upload size={13} />
                        Upload Resume
                      </Button>
                      <Button variant="secondary" size="sm">
                        <Upload size={13} />
                        Upload ID
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
                  onToggle={toggleItTask}
                  countColor="bg-blue-50 text-blue-700"
                />
                <TaskSection
                  icon={<UserCheck size={15} />}
                  title="New Hire Tasks"
                  description="Required documentation and training for new employees"
                  tasks={hireTasks}
                  onToggle={toggleHireTask}
                  countColor="bg-violet-50 text-violet-700"
                />
                <TaskSection
                  icon={<Users size={15} />}
                  title="Manager Tasks"
                  description="Items your manager needs to complete to set you up for success"
                  tasks={managerTasks}
                  onToggle={toggleManagerTask}
                  countColor="bg-amber-50 text-amber-700"
                />
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {/* Profile summary */}
                <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-5">
                    Profile summary
                  </h2>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { label: 'Full name', value: form.fullName },
                      { label: 'Pronouns', value: form.pronouns },
                      { label: 'Job title', value: form.jobTitle },
                      { label: 'Manager', value: form.manager || '—' },
                      { label: 'Start date', value: form.startDate || '—' },
                      { label: 'Work location', value: { remote: 'Remote', onsite: 'On-site', hybrid: 'Hybrid' }[form.workLocation] ?? form.workLocation },
                      { label: 'Work email', value: form.workEmail },
                      { label: 'Phone', value: form.phone },
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
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-5">
                    Task progress
                  </h2>
                  <div className="space-y-4">
                    {[
                      { label: 'IT Tasks', tasks: itTasks },
                      { label: 'New Hire Tasks', tasks: hireTasks },
                      { label: 'Manager Tasks', tasks: managerTasks },
                    ].map(({ label, tasks }) => {
                      const done = tasks.filter((t) => t.checked).length;
                      const pct = Math.round((done / tasks.length) * 100);
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-[var(--color-text-primary)]">{label}</span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {done} / {tasks.length}
                            </span>
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

                {/* Completion banner */}
                {isComplete && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Check size={14} className="text-white" strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        Onboarding complete — welcome to the team!
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Your profile has been submitted for review.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Footer actions ─────────────────────────────────────────── */}
            <div className="bg-white border border-[var(--color-border)] rounded-2xl px-6 py-4 shadow-card">
              {/* Progress + nav buttons */}
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
                    onClick={handleBack}
                    disabled={currentStep === 1}
                  >
                    Back
                  </Button>
                  <Button variant="primary" size="md" onClick={handleContinue}>
                    {currentStep === 3 ? 'Complete Onboarding' : 'Save & Continue'}
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>

              {/* Secondary actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
                <Button variant="ghost" size="sm">
                  <Download size={13} />
                  Download Summary
                </Button>
                <Button variant="ghost" size="sm">
                  <HelpCircle size={13} />
                  Request Assistance
                </Button>
                {currentStep < 3 && (
                  <button
                    className="ml-auto text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                    onClick={() => setCurrentStep((s) => Math.min(s + 1, 3))}
                  >
                    Skip for now →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Right sidebar ──────────────────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 space-y-4">

            {/* Onboarding checklist */}
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                Onboarding checklist
              </h3>
              <ul className="space-y-3">
                {checklist.map((item) => (
                  <li key={item.id}>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleChecklist(item.id)}
                        className="w-4 h-4 rounded border-[var(--color-border)] accent-black cursor-pointer flex-shrink-0"
                      />
                      <span
                        className={[
                          'text-sm transition-colors',
                          item.checked
                            ? 'line-through text-[var(--color-text-muted)]'
                            : 'text-[var(--color-text-primary)] group-hover:text-black',
                        ].join(' ')}
                      >
                        {item.label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)]">
                  {checklist.filter((i) => i.checked).length} of {checklist.length} completed
                </p>
              </div>
            </div>

            {/* Helpful resources */}
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                Helpful resources
              </h3>
              <ul className="space-y-2">
                {RESOURCES.map((res) => (
                  <li key={res.id}>
                    <button className="w-full text-left px-3 py-2.5 rounded-xl border border-[var(--color-border)] hover:border-neutral-300 hover:shadow-card transition-all group">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-black">
                        {res.title}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {res.description}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent activity */}
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                Recent activity
              </h3>
              <ul className="space-y-3">
                {RECENT_ACTIVITY.map(({ text, time }) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[var(--color-text-primary)]">{text}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OnboardingStatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-card">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className={['text-2xl font-bold leading-tight', color].join(' ')}>{value}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>
    </div>
  );
}

const PRIORITY_BADGE: Record<Task['priority'], BadgeVariant> = {
  high: 'error',
  medium: 'warning',
  low: 'default',
};

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
  const pct = Math.round((done / tasks.length) * 100);

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

      {/* Progress bar */}
      <div className="h-1 bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] overflow-hidden my-4">
        <div
          className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Task rows */}
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
