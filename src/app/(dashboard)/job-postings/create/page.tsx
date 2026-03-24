'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { jobsApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  department: string;
  location: string;
  type: string;
  status: string;
  description: string;
  requirements: string;
  salaryMin: string;
  salaryMax: string;
}

const EMPTY: FormState = {
  title:        '',
  department:   '',
  location:     '',
  type:         'FULL_TIME',
  status:       'DRAFT',
  description:  '',
  requirements: '',
  salaryMin:    '',
  salaryMax:    '',
};

const SELECT_CLASS =
  'w-full h-10 px-3 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow appearance-none';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateJobPostingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm]             = useState<FormState>(EMPTY);
  const [errors, setErrors]         = useState<Partial<FormState>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.title.trim())       e.title       = 'Job title is required';
    if (!form.department.trim())  e.department  = 'Department is required';
    if (!form.location.trim())    e.location    = 'Location is required';
    if (!form.description.trim()) e.description = 'Description is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await jobsApi.createJob({
        title:        form.title.trim(),
        department:   form.department.trim(),
        location:     form.location.trim(),
        type:         form.type,
        status:       form.status,
        description:  form.description.trim(),
        requirements: form.requirements.trim() || undefined,
        salaryMin:    form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax:    form.salaryMax ? Number(form.salaryMax) : undefined,
      });
      showToast('Job posting created successfully');
      router.push(`/job-postings/${result.job.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create job posting';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Job Postings
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-primary)] tracking-tight">
          Create Job Posting
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Fill in the details below to create a new position.
        </p>
      </header>

      <Card padding="lg">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Title */}
          <Input
            label="Job Title"
            placeholder="e.g. Senior Software Engineer"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            error={errors.title}
          />

          {/* Department + Location */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Department"
              placeholder="e.g. Engineering"
              value={form.department}
              onChange={(e) => update('department', e.target.value)}
              error={errors.department}
            />
            <Input
              label="Location"
              placeholder="e.g. New York, NY"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              error={errors.location}
            />
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Job Type
              </label>
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="DRAFT">Draft</option>
                <option value="OPEN">Open</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>
          </div>

          {/* Salary range */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Salary (optional)"
              type="number"
              placeholder="e.g. 80000"
              value={form.salaryMin}
              onChange={(e) => update('salaryMin', e.target.value)}
            />
            <Input
              label="Max Salary (optional)"
              type="number"
              placeholder="e.g. 120000"
              value={form.salaryMax}
              onChange={(e) => update('salaryMax', e.target.value)}
            />
          </div>

          {/* Description */}
          <Input
            label="Job Description"
            multiline
            rows={6}
            placeholder="Describe the role, responsibilities, and team…"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            error={errors.description}
          />

          {/* Requirements */}
          <Input
            label="Requirements (optional)"
            multiline
            rows={5}
            placeholder="List required skills, qualifications, or experience…"
            value={form.requirements}
            onChange={(e) => update('requirements', e.target.value)}
          />

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" size="md" className="flex-1 justify-center" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" className="flex-1 justify-center" isLoading={isSubmitting}>
              Create Job Posting
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
