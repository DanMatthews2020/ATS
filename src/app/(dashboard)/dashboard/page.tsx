'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Shield, X } from 'lucide-react';
import { dashboardApi, jobsApi, candidatesApi, rightsRequestsApi, retentionApi, ApiError } from '@/lib/api';
import type { DashboardStats, JobListingDto, CandidateTrackingDto } from '@/lib/api';
import { JobListingCard } from '@/components/dashboard/JobListingCard';
import { CandidateCard } from '@/components/dashboard/CandidateCard';
import { useAuth } from '@/hooks/useAuth';
import type { Job, Candidate } from '@/types';

// ─── Stat card labels & fallback ordering ─────────────────────────────────────

const STAT_ORDER: { key: keyof DashboardStats; label: string }[] = [
  { key: 'openPositions',       label: 'Open Positions' },
  { key: 'activeCandidates',    label: 'Active Candidates' },
  { key: 'interviewsScheduled', label: 'Interviews Scheduled' },
  { key: 'offersSent',          label: 'Offers Sent' },
];

// ─── Shape adapters (API → component prop types) ──────────────────────────────

function toJob(dto: JobListingDto): Job {
  return {
    id:             dto.id,
    title:          dto.title,
    department:     dto.department,
    location:       dto.location,
    type:           dto.type as Job['type'],
    status:         dto.status as Job['status'],
    description:    dto.description,
    applicantCount: dto.applicantCount,
    postedAt:       dto.postedAt,
  };
}

function toCandidate(dto: CandidateTrackingDto): Candidate {
  return {
    id:        dto.candidateId,
    name:      dto.candidateName,
    role:      dto.jobTitle,
    avatarUrl: '',
    status:    dto.status as Candidate['status'],
    appliedAt: dto.appliedAt,
    jobId:     dto.id,
  };
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-card p-5 space-y-2 animate-pulse">
      <div className="h-2.5 w-24 bg-neutral-100 rounded" />
      <div className="h-7 w-16 bg-neutral-200 rounded" />
      <div className="h-2.5 w-20 bg-neutral-100 rounded" />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-card p-4 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="space-y-1.5">
          <div className="h-3.5 w-36 bg-neutral-200 rounded" />
          <div className="h-2.5 w-20 bg-neutral-100 rounded" />
        </div>
        <div className="h-5 w-14 bg-neutral-100 rounded-full" />
      </div>
      <div className="h-2.5 w-full bg-neutral-100 rounded" />
      <div className="h-2.5 w-3/4 bg-neutral-100 rounded" />
    </div>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      <AlertCircle size={15} className="flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
      >
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// ─── Compliance banner ──────────────────────────────────────────────────────

const BANNER_DISMISS_KEY = 'compliance-banner-dismissed';

function ComplianceBanner() {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem(BANNER_DISMISS_KEY)) return;
    setDismissed(false);

    Promise.all([
      rightsRequestsApi.fetchAll({ status: 'OPEN', limit: 1 }),
      retentionApi.fetchCandidates(),
    ]).then(([reqData, retData]) => {
      const alerts: string[] = [];
      if (reqData.total > 0) alerts.push(`${reqData.total} open rights request${reqData.total > 1 ? 's' : ''}`);
      const expired = retData.items.filter((c) => c.retentionStatus === 'EXPIRED').length;
      if (expired > 0) alerts.push(`${expired} expired retention record${expired > 1 ? 's' : ''}`);
      setItems(alerts);
    }).catch(() => {});
  }, []);

  if (dismissed || items.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800" data-testid="compliance-banner">
      <Shield size={16} className="flex-shrink-0 text-amber-600" />
      <span className="flex-1">
        <strong>Compliance attention needed:</strong> {items.join(' · ')}.{' '}
        <Link href="/settings/gdpr" className="underline hover:text-amber-900">Review in GDPR hub →</Link>
      </span>
      <button
        onClick={() => { sessionStorage.setItem(BANNER_DISMISS_KEY, '1'); setDismissed(true); }}
        className="p-0.5 rounded hover:bg-amber-100 transition-colors"
        aria-label="Dismiss compliance banner"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const isComplianceUser = user?.role === 'ADMIN' || user?.role === 'HR';

  const [stats, setStats]           = useState<DashboardStats | null>(null);
  const [jobs, setJobs]             = useState<JobListingDto[]>([]);
  const [candidates, setCandidates] = useState<CandidateTrackingDto[]>([]);

  const [statsLoading, setStatsLoading]         = useState(true);
  const [jobsLoading, setJobsLoading]           = useState(true);
  const [candidatesLoading, setCandidatesLoading] = useState(true);

  const [statsError, setStatsError]         = useState<string | null>(null);
  const [jobsError, setJobsError]           = useState<string | null>(null);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);

  function fetchStats() {
    setStatsLoading(true);
    setStatsError(null);
    dashboardApi
      .getStats()
      .then(setStats)
      .catch((err) =>
        setStatsError(err instanceof ApiError ? err.message : 'Failed to load stats'),
      )
      .finally(() => setStatsLoading(false));
  }

  function fetchJobs() {
    setJobsLoading(true);
    setJobsError(null);
    jobsApi
      .getJobs(1, 3)
      .then((res) => setJobs(res.items))
      .catch((err) =>
        setJobsError(err instanceof ApiError ? err.message : 'Failed to load jobs'),
      )
      .finally(() => setJobsLoading(false));
  }

  function fetchCandidates() {
    setCandidatesLoading(true);
    setCandidatesError(null);
    candidatesApi
      .getTracking(1, 3)
      .then((res) => setCandidates(res.items))
      .catch((err) =>
        setCandidatesError(err instanceof ApiError ? err.message : 'Failed to load candidates'),
      )
      .finally(() => setCandidatesLoading(false));
  }

  useEffect(() => {
    fetchStats();
    fetchJobs();
    fetchCandidates();
  }, []);

  return (
    <div className="p-8 space-y-8 flex-1">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-primary)] tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Here&apos;s what&apos;s happening across your talent pipeline today.
        </p>
      </header>

      {/* ── Compliance banner (ADMIN/HR only) ─────────────────────────── */}
      {isComplianceUser && <ComplianceBanner />}

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <section aria-label="Key metrics">
        {statsError ? (
          <SectionError message={statsError} onRetry={fetchStats} />
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {statsLoading || !stats
              ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
              : STAT_ORDER.map(({ key, label }) => (
                  <div
                    key={key}
                    className="bg-white rounded-xl border border-[var(--color-border)] shadow-card p-5 space-y-1"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                      {label}
                    </p>
                    <p className="text-2xl font-bold text-[var(--color-primary)] tabular-nums">
                      {stats[key]}
                    </p>
                  </div>
                ))}
          </div>
        )}
      </section>

      {/* ── Job Listings ─────────────────────────────────────────────────── */}
      <section aria-labelledby="job-listings-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="job-listings-heading" className="text-base font-semibold text-[var(--color-primary)]">
            Job Listings
          </h2>
          <a
            href="/jobs"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-100 outline-none focus-visible:underline"
          >
            View all →
          </a>
        </div>

        {jobsError ? (
          <SectionError message={jobsError} onRetry={fetchJobs} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {jobsLoading
              ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              : jobs.length === 0
              ? <p className="text-sm text-[var(--color-text-muted)] col-span-3">No open jobs yet. <a href="/jobs/create" className="text-[var(--color-primary)] hover:underline">Create one →</a></p>
              : jobs.map((dto) => <JobListingCard key={dto.id} job={toJob(dto)} />)}
          </div>
        )}
      </section>

      {/* ── Candidate Tracking ───────────────────────────────────────────── */}
      <section aria-labelledby="candidate-tracking-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="candidate-tracking-heading" className="text-base font-semibold text-[var(--color-primary)]">
            Candidate Tracking
          </h2>
          <a
            href="/candidates"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors duration-100 outline-none focus-visible:underline"
          >
            View all →
          </a>
        </div>

        {candidatesError ? (
          <SectionError message={candidatesError} onRetry={fetchCandidates} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {candidatesLoading
              ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
              : candidates.length === 0
              ? <p className="text-sm text-[var(--color-text-muted)] col-span-3">No candidates yet. <a href="/candidates" className="text-[var(--color-primary)] hover:underline">Add one →</a></p>
              : candidates.map((dto) => (
                  <CandidateCard key={dto.id} candidate={toCandidate(dto)} />
                ))}
          </div>
        )}
      </section>
    </div>
  );
}
