'use client';

import { useState, type FormEvent } from 'react';
import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ApplicationsStatusPanel } from '@/components/job-postings/ApplicationsStatusPanel';
import type { JobPostingFormData } from '@/types';

// Note: Metadata cannot be exported from client components.
// Title is inherited from root layout template.

const EMPTY_FORM: JobPostingFormData = {
  title: '',
  description: '',
  criteria: '',
};

export default function JobPostingsPage() {
  const [form, setForm] = useState<JobPostingFormData>(EMPTY_FORM);
  const [titleError, setTitleError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPosted, setIsPosted] = useState(false);

  function updateField(field: keyof JobPostingFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'title' && titleError) setTitleError('');
    if (isPosted) setIsPosted(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPosted(false);

    if (!form.title.trim()) {
      setTitleError('Please enter a job title.');
      return;
    }

    setIsSubmitting(true);
    // Simulate posting delay
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    setIsPosted(true);
    setForm(EMPTY_FORM);
  }

  return (
    <div className="p-8 flex-1">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-primary)] tracking-tight">
          Job Postings
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Create and manage your open positions.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Create Job Posting Form ──────────────────────────────────── */}
        <Card padding="lg">
          {/* Success banner */}
          {isPosted ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2.5 px-4 py-3 mb-6 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800"
            >
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
              Your job has been posted successfully.
            </div>
          ) : null}

          <h2 className="text-lg font-semibold text-[var(--color-primary)] mb-6">
            Create Job Posting
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Job Title */}
            <div>
              <label
                htmlFor="job-title"
                className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5"
              >
                Job Title{' '}
                <span className="text-[var(--color-accent)]" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="job-title"
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                aria-required="true"
                aria-describedby={titleError ? 'title-error' : undefined}
                className={[
                  'h-10 w-full rounded-xl border px-3.5 text-sm bg-white',
                  'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
                  'outline-none transition-colors duration-150 focus:ring-2',
                  titleError
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/10',
                ].join(' ')}
              />
              {titleError ? (
                <p id="title-error" role="alert" className="mt-1.5 text-xs text-red-500">
                  {titleError}
                </p>
              ) : null}
            </div>

            {/* Job Description */}
            <Textarea
              label="Job Description"
              id="job-description"
              rows={6}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe the role, responsibilities, and team..."
            />

            {/* Application Criteria */}
            <Textarea
              label="Application Criteria"
              id="application-criteria"
              rows={5}
              value={form.criteria}
              onChange={(e) => updateField('criteria', e.target.value)}
              placeholder="List required skills, qualifications, or experience..."
            />

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
              >
                Post to Job Boards
              </Button>
            </div>
          </form>
        </Card>

        {/* ── Applications Status ──────────────────────────────────────── */}
        <ApplicationsStatusPanel />
      </div>
    </div>
  );
}
