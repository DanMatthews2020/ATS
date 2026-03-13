'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  MapPin,
  Users,
  Clock,
  ChevronRight,
  BarChart2,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { MOCK_JOBS, MOCK_APPLICATION_STATUSES } from '@/lib/constants';
import type { JobStatus, BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<JobStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'success' },
  draft: { label: 'Draft', variant: 'default' },
  closed: { label: 'Closed', variant: 'error' },
};

const TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
};

type FilterKey = JobStatus | 'all';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'draft', label: 'Draft' },
  { key: 'closed', label: 'Closed' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobPostingsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return MOCK_JOBS;
    return MOCK_JOBS.filter((j) => j.status === activeFilter);
  }, [activeFilter]);

  function tabCount(key: FilterKey): number {
    if (key === 'all') return MOCK_JOBS.length;
    return MOCK_JOBS.filter((j) => j.status === key).length;
  }

  const totalApplicants = MOCK_JOBS.reduce((sum, j) => sum + j.applicantCount, 0);

  return (
    <div className="p-8 flex-1">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
            <Briefcase size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              Job Postings
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Manage and publish open positions
            </p>
          </div>
        </div>
        <Link href="/job-postings/create">
          <Button variant="primary" size="md">
            <Plus size={15} />
            Create Job Posting
          </Button>
        </Link>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Open Positions"
          value={String(tabCount('open'))}
          sub="+2 this week"
          icon={<Briefcase size={14} />}
        />
        <StatCard
          label="Total Applicants"
          value={String(totalApplicants)}
          sub="Across all roles"
          icon={<Users size={14} />}
        />
        <StatCard
          label="Avg. Time to Fill"
          value="18d"
          sub="−3 from last month"
          icon={<Clock size={14} />}
        />
        <StatCard
          label="Offer Acceptance"
          value="78%"
          sub="+5% this quarter"
          icon={<TrendingUp size={14} />}
        />
      </div>

      {/* ── Main two-column layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">

        {/* Left — job listings ─────────────────────────────────────────── */}
        <div>
          {/* Filter tabs */}
          <div className="flex items-center gap-0.5 mb-4 border-b border-[var(--color-border)]">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={[
                    'px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-neutral-300',
                  ].join(' ')}
                >
                  {tab.label}
                  <span
                    className={[
                      'ml-1.5 text-xs tabular-nums',
                      isActive
                        ? 'text-[var(--color-text-muted)]'
                        : 'text-[var(--color-text-muted)]/60',
                    ].join(' ')}
                  >
                    {tabCount(tab.key)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Job rows */}
          {filtered.length > 0 ? (
            <ul className="space-y-3">
              {filtered.map((job) => {
                const status = STATUS_CONFIG[job.status];
                return (
                  <li key={job.id}>
                    <div className="bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150">
                      <div className="flex items-start justify-between gap-4">

                        {/* Job info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                              {job.title}
                            </h3>
                            <Badge variant={status.variant}>{status.label}</Badge>
                            <span className="text-xs text-[var(--color-text-muted)] px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg">
                              {TYPE_LABELS[job.type] ?? job.type}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-3 leading-relaxed">
                            {job.description}
                          </p>
                          <div className="flex items-center flex-wrap gap-4">
                            <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                              <MapPin size={11} aria-hidden="true" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                              <Briefcase size={11} aria-hidden="true" />
                              {job.department}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                              <Users size={11} aria-hidden="true" />
                              {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                              <Clock size={11} aria-hidden="true" />
                              Posted {formatDate(job.postedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          <Button variant="secondary" size="sm">
                            View
                            <ChevronRight size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-center mb-4 shadow-card">
                <Briefcase size={20} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                No job postings found
              </p>
              <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
                Create your first posting to get started
              </p>
              <Link href="/job-postings/create">
                <Button variant="primary" size="sm">
                  <Plus size={13} />
                  Create Job Posting
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Right — sidebar ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Applications Status */}
          <Card padding="md">
            <h2 className="text-base font-semibold text-[var(--color-primary)] mb-4">
              Applications Status
            </h2>
            <ul className="divide-y divide-[var(--color-border)]" role="list">
              {MOCK_APPLICATION_STATUSES.map((entry) => (
                <li
                  key={entry.id}
                  className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0"
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
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors whitespace-nowrap outline-none focus-visible:underline"
                  >
                    {entry.candidateName}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <Link href="/job-postings/create">
                <Button variant="primary" size="sm" className="w-full justify-center">
                  <Plus size={13} />
                  Create Job Posting
                </Button>
              </Link>
            </div>
          </Card>

          {/* Quick stats card */}
          <Card padding="md">
            <h2 className="text-base font-semibold text-[var(--color-primary)] mb-4">
              Pipeline Overview
            </h2>
            <ul className="space-y-3">
              {[
                { label: 'Active pipelines', value: String(tabCount('open')) },
                { label: 'Pending review', value: '14' },
                { label: 'Interviews this week', value: '9' },
                { label: 'Offers extended', value: '3' },
              ].map(({ label, value }) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {value}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <Link
                href="/pipeline"
                className="flex items-center justify-between text-sm font-medium text-[var(--color-text-primary)] hover:text-black transition-colors group"
              >
                View full pipeline
                <ChevronRight
                  size={14}
                  className="text-[var(--color-text-muted)] group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <span className="text-[var(--color-text-muted)]">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
