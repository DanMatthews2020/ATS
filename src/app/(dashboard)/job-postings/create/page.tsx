'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { MOCK_APPLICATION_STATUSES } from '@/lib/constants';
import type { JobPostingFormData } from '@/types';

const EMPTY_FORM: JobPostingFormData = {
  title: '',
  description: '',
  criteria: '',
};

export default function CreateJobPostingPage() {
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
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
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
          Create and publish new positions to your job boards.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">

        {/* ── Create Job Posting form ──────────────────────────────────── */}
        <Card padding="lg">
          {/* Success banner */}
          {isPosted ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2.5 px-4 py-3 mb-6 rounded-xl text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200"
            >
              <CheckCircle2
                size={16}
                className="text-emerald-600 flex-shrink-0"
                aria-hidden="true"
              />
              Your job has been posted successfully.
            </div>
          ) : null}

          <h2 className="text-lg font-semibold text-[var(--color-primary)] mb-6">
            Create Job Posting
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Job Title — required, shows inline error */}
            <Input
              label="Job Title"
              type="text"
              placeholder="e.g. Senior Software Engineer"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              error={titleError}
              aria-required="true"
            />

            {/* Job Description — textarea via multiline prop */}
            <Input
              label="Job Description"
              multiline
              rows={7}
              placeholder="Describe the role, responsibilities, and team…"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />

            {/* Application Criteria — textarea via multiline prop */}
            <Input
              label="Application Criteria"
              multiline
              rows={6}
              placeholder="List required skills, qualifications, or experience…"
              value={form.criteria}
              onChange={(e) => updateField('criteria', e.target.value)}
            />

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                className="w-full"
              >
                Post to Job Boards
              </Button>
            </div>
          </form>
        </Card>

        {/* ── Applications Status sidebar ──────────────────────────────── */}
        <Card padding="md">
          <h2 className="text-base font-semibold text-[var(--color-primary)] mb-4">
            Applications Status
          </h2>

          <ul className="divide-y divide-[var(--color-border)]" role="list">
            {MOCK_APPLICATION_STATUSES.map((entry) => (
              <li
                key={entry.id}
                className="py-3 flex items-start justify-between gap-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-primary)] leading-snug truncate">
                    {entry.jobTitle}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {entry.appliedAgo}
                  </p>
                </div>
                <Link
                  href={`/candidates/${entry.candidateId}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-100 whitespace-nowrap outline-none focus-visible:underline"
                >
                  {entry.candidateName}
                </Link>
              </li>
            ))}
          </ul>
        </Card>

      </div>
    </div>
  );
}
