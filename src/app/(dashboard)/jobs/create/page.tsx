'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X, Plus, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { jobsApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'Marketing', 'Sales',
  'Human Resources', 'Finance', 'Operations', 'Legal', 'Customer Success',
  'Data & Analytics', 'Security', 'Other',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

const JOB_BOARDS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'indeed', label: 'Indeed' },
  { id: 'glassdoor', label: 'Glassdoor' },
  { id: 'website', label: 'Company Website' },
];

const SELECT_CLASS =
  'w-full h-10 px-3 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-shadow appearance-none';

const LABEL_CLASS = 'block text-sm font-medium text-[var(--color-text-primary)] mb-1.5';

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  department: string;
  customDepartment: string;
  location: string;
  workArrangement: 'onsite' | 'hybrid' | 'remote';
  type: string;
  description: string;
  requirements: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  criteria: string[];
  jobBoards: string[];
}

const EMPTY: FormState = {
  title:            '',
  department:       '',
  customDepartment: '',
  location:         '',
  workArrangement:  'onsite',
  type:             'FULL_TIME',
  description:      '',
  requirements:     '',
  salaryMin:        '',
  salaryMax:        '',
  currency:         'USD',
  criteria:         [],
  jobBoards:        ['linkedin', 'website'],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateJobPostingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm]                   = useState<FormState>(EMPTY);
  const [errors, setErrors]               = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [criteriaInput, setCriteriaInput]   = useState('');
  const [criteriaFocused, setCriteriaFocused] = useState(false);

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  // ── Criteria tag input ───────────────────────────────────────────────────

  function addCriteria() {
    const val = criteriaInput.trim();
    if (!val || form.criteria.includes(val)) return;
    update('criteria', [...form.criteria, val]);
    setCriteriaInput('');
  }

  function removeCriteria(tag: string) {
    update('criteria', form.criteria.filter((c) => c !== tag));
  }

  function onCriteriaKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCriteria(); }
    if (e.key === 'Backspace' && !criteriaInput && form.criteria.length > 0) {
      update('criteria', form.criteria.slice(0, -1));
    }
  }

  function toggleJobBoard(id: string) {
    update('jobBoards', form.jobBoards.includes(id)
      ? form.jobBoards.filter((b) => b !== id)
      : [...form.jobBoards, id]
    );
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim())       e.title       = 'Job title is required';
    if (!form.department)         e.department  = 'Department is required';
    if (form.department === 'Other' && !form.customDepartment.trim())
      e.customDepartment = 'Please specify the department';
    if (!form.location.trim())    e.location    = 'Location is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax))
      e.salaryMax = 'Max salary must be ≥ min salary';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(status: 'DRAFT' | 'OPEN') {
    if (!validate()) return;

    const department = form.department === 'Other' ? form.customDepartment.trim() : form.department;
    const arrangement = form.workArrangement !== 'onsite' ? ` (${form.workArrangement === 'remote' ? 'Remote' : 'Hybrid'})` : '';
    const location = `${form.location.trim()}${arrangement}`;

    // Append criteria to requirements if provided
    let requirements = form.requirements.trim() || undefined;
    if (form.criteria.length > 0) {
      const criteriaBlock = `Requirements:\n${form.criteria.map((c) => `• ${c}`).join('\n')}`;
      requirements = requirements ? `${requirements}\n\n${criteriaBlock}` : criteriaBlock;
    }

    setIsSubmitting(true);
    try {
      const result = await jobsApi.createJob({
        title:        form.title.trim(),
        department,
        location,
        type:         form.type,
        status,
        description:  form.description.trim(),
        requirements,
        salaryMin:    form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax:    form.salaryMax ? Number(form.salaryMax) : undefined,
      });
      showToast(status === 'DRAFT' ? 'Job saved as draft' : 'Job posting published', 'success');
      router.push(`/jobs/${result.job.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create job posting';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-2xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Jobs
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-primary)] tracking-tight">
          Create Job Posting
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Fill in the details below to create a new position.
        </p>
      </header>

      <div className="space-y-5">

        {/* ── Basic info ──────────────────────────────────────────────── */}
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Basic Information</h2>
          <div className="space-y-4">

            <Input
              label="Job Title"
              placeholder="e.g. Senior Software Engineer"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              error={errors.title}
            />

            {/* Department */}
            <div>
              <label className={LABEL_CLASS}>Department</label>
              <select
                value={form.department}
                onChange={(e) => update('department', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Select department…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department}</p>}
            </div>
            {form.department === 'Other' && (
              <Input
                label="Specify Department"
                placeholder="e.g. Research & Development"
                value={form.customDepartment}
                onChange={(e) => update('customDepartment', e.target.value)}
                error={errors.customDepartment}
              />
            )}

            {/* Location + arrangement */}
            <div>
              <label className={LABEL_CLASS}>Location</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="e.g. New York, NY"
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-shadow"
                  />
                </div>
                <div className="flex rounded-xl border border-[var(--color-border)] overflow-hidden text-xs font-medium">
                  {(['onsite', 'hybrid', 'remote'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => update('workArrangement', opt)}
                      className={`px-3 py-2 capitalize transition-colors ${
                        form.workArrangement === opt
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
                      }`}
                    >
                      {opt === 'onsite' ? 'On-site' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
            </div>

            {/* Type */}
            <div>
              <label className={LABEL_CLASS}>Employment Type</label>
              <div className="flex gap-2">
                {[
                  { value: 'FULL_TIME', label: 'Full-time' },
                  { value: 'PART_TIME', label: 'Part-time' },
                  { value: 'CONTRACT',  label: 'Contract' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('type', opt.value)}
                    className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-colors ${
                      form.type === opt.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Salary ──────────────────────────────────────────────────── */}
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Salary Range <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></h2>
          <div className="grid grid-cols-[80px_1fr_1fr] gap-3">
            <div>
              <label className={LABEL_CLASS}>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                className={SELECT_CLASS}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input
              label="Minimum"
              type="number"
              placeholder="80,000"
              value={form.salaryMin}
              onChange={(e) => update('salaryMin', e.target.value)}
            />
            <Input
              label="Maximum"
              type="number"
              placeholder="120,000"
              value={form.salaryMax}
              onChange={(e) => update('salaryMax', e.target.value)}
              error={errors.salaryMax}
            />
          </div>
        </Card>

        {/* ── Description ─────────────────────────────────────────────── */}
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Job Description</h2>
          <div className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Description <span className="text-red-500">*</span></label>
              <textarea
                placeholder="Describe the role, key responsibilities, team context, and what success looks like…"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={8}
                className={`w-full px-3 py-2.5 text-sm rounded-xl border bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-shadow resize-y leading-relaxed ${
                  errors.description ? 'border-red-400' : 'border-[var(--color-border)]'
                }`}
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
            </div>

            <div>
              <label className={LABEL_CLASS}>Requirements <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label>
              <textarea
                placeholder="List required skills, qualifications, or experience…"
                value={form.requirements}
                onChange={(e) => update('requirements', e.target.value)}
                rows={5}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-shadow resize-y leading-relaxed"
              />
            </div>
          </div>
        </Card>

        {/* ── Application criteria ─────────────────────────────────────── */}
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Application Criteria <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">Tags used to screen applicants. Press Enter or comma to add.</p>

          <div className={`min-h-[42px] flex flex-wrap gap-2 items-center px-3 py-2 rounded-xl border transition-shadow bg-white ${
            criteriaFocused
              ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
              : 'border-[var(--color-border)]'
          }`}>
            {form.criteria.map((tag) => (
              <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-medium rounded-lg">
                {tag}
                <button type="button" onClick={() => removeCriteria(tag)} className="hover:opacity-70 transition-opacity">
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              id="criteria-input"
              type="text"
              placeholder={form.criteria.length === 0 ? 'e.g. 5+ years experience, Bachelor\'s degree…' : 'Add more…'}
              value={criteriaInput}
              onChange={(e) => setCriteriaInput(e.target.value)}
              onKeyDown={onCriteriaKeyDown}
              onFocus={() => setCriteriaFocused(true)}
              onBlur={() => { setCriteriaFocused(false); addCriteria(); }}
              className="flex-1 min-w-[160px] text-sm bg-transparent text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            />
          </div>
        </Card>

        {/* ── Job boards ───────────────────────────────────────────────── */}
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Post to Job Boards</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">Select where to distribute this posting when published.</p>
          <div className="grid grid-cols-2 gap-2">
            {JOB_BOARDS.map((board) => {
              const checked = form.jobBoards.includes(board.id);
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => toggleJobBoard(board.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm text-left transition-colors ${
                    checked
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-text-primary)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    checked ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]'
                  }`}>
                    {checked && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {board.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Job board integrations coming soon — selections are saved for when they go live.
          </p>
        </Card>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 pb-8">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="flex-1 justify-center"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="flex-1 justify-center"
            onClick={() => handleSubmit('DRAFT')}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="flex-1 justify-center"
            onClick={() => handleSubmit('OPEN')}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
