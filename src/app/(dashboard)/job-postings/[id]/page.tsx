'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Users, Clock, Briefcase,
  DollarSign, Loader2, Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { jobsApi, type JobDetailDto } from '@/lib/api';
import type { BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  open:      { label: 'Open',    variant: 'success' },
  draft:     { label: 'Draft',   variant: 'default' },
  closed:    { label: 'Closed',  variant: 'error' },
  'on-hold': { label: 'On Hold', variant: 'warning' },
};

const TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract:    'Contract',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSalary(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob]             = useState<JobDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await jobsApi.getJob(id);
        setJob(data.job);
      } catch {
        setError('Job posting not found.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={28} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-8">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6">
          <ArrowLeft size={14} /> Back
        </button>
        <p className="text-sm text-red-600">{error || 'Not found.'}</p>
      </div>
    );
  }

  const status = STATUS_CONFIG[job.status] ?? { label: job.status, variant: 'default' as BadgeVariant };

  return (
    <div className="p-8 max-w-4xl">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Job Postings
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{job.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-xs px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)]">
              {TYPE_LABELS[job.type] ?? job.type}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5"><MapPin size={13} />{job.location}</span>
            <span className="flex items-center gap-1.5"><Briefcase size={13} />{job.department}</span>
            <span className="flex items-center gap-1.5"><Users size={13} />{job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1.5"><Clock size={13} />Posted {formatDate(job.postedAt)}</span>
            {(job.salaryMin || job.salaryMax) && (
              <span className="flex items-center gap-1.5">
                <DollarSign size={13} />
                {job.salaryMin && job.salaryMax
                  ? `${formatSalary(job.salaryMin)} – ${formatSalary(job.salaryMax)}`
                  : job.salaryMin
                  ? `From ${formatSalary(job.salaryMin)}`
                  : `Up to ${formatSalary(job.salaryMax!)}`}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href="/candidates">
            <Button variant="primary" size="md">
              <Plus size={14} /> Add Candidate
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-6">

        {/* Left — description + requirements */}
        <div className="space-y-5">
          <Card padding="lg">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">Description</h2>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </Card>

          {job.requirements && (
            <Card padding="lg">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">Requirements</h2>
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                {job.requirements}
              </p>
            </Card>
          )}
        </div>

        {/* Right — meta */}
        <Card padding="md">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Details</h2>
          <ul className="space-y-3">
            <MetaRow label="Status" value={<Badge variant={status.variant}>{status.label}</Badge>} />
            <MetaRow label="Type" value={TYPE_LABELS[job.type] ?? job.type} />
            <MetaRow label="Department" value={job.department} />
            <MetaRow label="Location" value={job.location} />
            <MetaRow label="Applicants" value={String(job.applicantCount)} />
            {job.salaryMin && <MetaRow label="Min Salary" value={formatSalary(job.salaryMin)} />}
            {job.salaryMax && <MetaRow label="Max Salary" value={formatSalary(job.salaryMax)} />}
            <MetaRow label="Posted" value={formatDate(job.postedAt)} />
            {job.createdByName && <MetaRow label="Created by" value={job.createdByName} />}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 text-sm">
      <span className="text-[var(--color-text-muted)] flex-shrink-0">{label}</span>
      <span className="text-[var(--color-text-primary)] font-medium text-right">{value}</span>
    </li>
  );
}
