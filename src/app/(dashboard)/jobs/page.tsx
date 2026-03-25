'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Plus, MapPin, Users, Clock,
  TrendingUp, Loader2, Calendar, Search,
  LayoutGrid, List, SlidersHorizontal, DollarSign, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  jobsApi,
  type JobListingDto,
  type JobStatsDto,
  type JobPipelineStatsDto,
  type JobPipelineStageCounts,
} from '@/lib/api';
import type { BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; dot: string }> = {
  open:      { label: 'Open',    variant: 'success', dot: 'bg-emerald-500' },
  draft:     { label: 'Draft',   variant: 'default', dot: 'bg-neutral-400' },
  closed:    { label: 'Closed',  variant: 'error',   dot: 'bg-red-500' },
  'on-hold': { label: 'On Hold', variant: 'warning', dot: 'bg-amber-500' },
};

const TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract:    'Contract',
};

const PIPELINE_STAGES: { key: keyof JobPipelineStageCounts; label: string }[] = [
  { key: 'leads',             label: 'Leads' },
  { key: 'applicationReview', label: 'Review' },
  { key: 'active',            label: 'Active' },
  { key: 'pendingOffer',      label: 'Offer' },
  { key: 'hired',             label: 'Hired' },
  { key: 'archived',          label: 'Archived' },
];

const STAGE_COLORS: Record<keyof JobPipelineStageCounts, string> = {
  leads:             'text-blue-600 bg-blue-50',
  applicationReview: 'text-violet-600 bg-violet-50',
  active:            'text-amber-600 bg-amber-50',
  pendingOffer:      'text-orange-600 bg-orange-50',
  hired:             'text-emerald-600 bg-emerald-50',
  archived:          'text-neutral-500 bg-neutral-100',
};

type ViewMode   = 'pipeline' | 'table';
type FilterKey  = 'all' | 'open' | 'draft' | 'closed' | 'on-hold';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'open',   label: 'Open' },
  { key: 'draft',  label: 'Draft' },
  { key: 'closed', label: 'Closed' },
];

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs]               = useState<JobListingDto[]>([]);
  const [stats, setStats]             = useState<JobStatsDto | null>(null);
  const [pipeline, setPipeline]       = useState<JobPipelineStatsDto>({});
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [search, setSearch]           = useState('');
  const [viewMode, setViewMode]       = useState<ViewMode>('pipeline');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [jobsResult, statsResult, pipelineResult] = await Promise.all([
        jobsApi.getJobs(1, 100),
        jobsApi.getStats(),
        jobsApi.getPipelineStats(),
      ]);
      setJobs(jobsResult.items);
      setStats(statsResult);
      setPipeline(pipelineResult.stats);
    } catch {
      setError('Failed to load jobs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = jobs.filter((j) => {
    if (activeFilter !== 'all' && j.status !== activeFilter) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) &&
        !j.department.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function tabCount(key: FilterKey) {
    if (key === 'all') return jobs.length;
    return jobs.filter((j) => j.status === key).length;
  }

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
              Jobs
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Manage and publish open positions
            </p>
          </div>
        </div>
        <Link href="/jobs/create">
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
          value={isLoading ? '…' : String(stats?.openPositions ?? tabCount('open'))}
          sub="Active roles"
          icon={<Briefcase size={14} />}
        />
        <StatCard
          label="Total Applicants"
          value={isLoading ? '…' : String(stats?.totalApplicants ?? 0)}
          sub="Across all roles"
          icon={<Users size={14} />}
        />
        <StatCard
          label="Interviews This Week"
          value={isLoading ? '…' : String(stats?.interviewsThisWeek ?? 0)}
          sub="Scheduled"
          icon={<Calendar size={14} />}
        />
        <StatCard
          label="Offers Extended"
          value={isLoading ? '…' : String(stats?.offersExtended ?? 0)}
          sub="Total sent"
          icon={<TrendingUp size={14} />}
        />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          <Input
            placeholder="Search jobs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* New Filter button */}
        <Button variant="secondary" size="sm">
          <SlidersHorizontal size={13} />
          Filter
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-1">
          <button
            onClick={() => setViewMode('pipeline')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              viewMode === 'pipeline'
                ? 'bg-white shadow-sm text-[var(--color-text-primary)] border border-[var(--color-border)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            <LayoutGrid size={13} />
            Pipeline
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              viewMode === 'table'
                ? 'bg-white shadow-sm text-[var(--color-text-primary)] border border-[var(--color-border)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            <List size={13} />
            Table
          </button>
        </div>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 mb-5 border-b border-[var(--color-border)]">
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
              <span className={['ml-1.5 text-xs tabular-nums', isActive ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]/60'].join(' ')}>
                {tabCount(tab.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchData}>Retry</Button>
        </div>
      ) : filtered.length > 0 ? (
        viewMode === 'pipeline' ? (
          <ul className="space-y-3">
            {filtered.map((job) => (
              <li key={job.id}>
                <JobCard
                  job={job}
                  pipelineStats={pipeline[job.id]}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <JobTable jobs={filtered} pipeline={pipeline} onRowClick={(id) => router.push(`/jobs/${id}`)} />
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-center mb-4 shadow-card">
            <Briefcase size={20} className="text-[var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">No job postings found</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">Create your first posting to get started</p>
          <Link href="/jobs/create">
            <Button variant="primary" size="sm"><Plus size={13} />Create Job Posting</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── JobCard ──────────────────────────────────────────────────────────────────

function JobCard({
  job,
  pipelineStats,
  onClick,
}: {
  job: JobListingDto & { salaryMin?: number; salaryMax?: number; visibility?: string };
  pipelineStats?: JobPipelineStageCounts;
  onClick: () => void;
}) {
  const status = STATUS_CONFIG[job.status] ?? { label: job.status, variant: 'default' as BadgeVariant, dot: 'bg-neutral-400' };
  const salary = formatSalary((job as { salaryMin?: number }).salaryMin, (job as { salaryMax?: number }).salaryMax);
  const totalInPipeline = pipelineStats
    ? Object.values(pipelineStats).reduce((a, b) => a + b, 0)
    : job.applicantCount;

  return (
    <div
      className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150 overflow-hidden"
    >
      {/* ── Card header ─────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title + status badge */}
            <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
              <button
                onClick={onClick}
                className="text-sm font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors text-left"
              >
                {job.title}
              </button>
              <Badge variant={status.variant}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${status.dot}`} />
                {status.label}
              </Badge>
            </div>

            {/* Metadata tags */}
            <div className="flex items-center flex-wrap gap-2">
              <MetaTag icon={<MapPin size={11} />} label={job.location} />
              <MetaTag icon={<Briefcase size={11} />} label={job.department} />
              <MetaTag icon={<Clock size={11} />} label={TYPE_LABELS[job.type] ?? job.type} />
              <MetaTag
                icon={job.status === 'open' ? <Eye size={11} /> : <EyeOff size={11} />}
                label={job.status === 'open' ? 'Visible' : 'Not Visible'}
              />
              {salary && <MetaTag icon={<DollarSign size={11} />} label={salary} />}
              <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <Users size={11} />
                {totalInPipeline} applicant{totalInPipeline !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <Calendar size={11} />
                Posted {formatDate(job.postedAt)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            <Button variant="secondary" size="sm" onClick={onClick}>
              View
            </Button>
          </div>
        </div>
      </div>

      {/* ── Pipeline breakdown ──────────────────────────────────────── */}
      <div className="px-5 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50">
        <div className="flex items-center gap-0 divide-x divide-[var(--color-border)]">
          {PIPELINE_STAGES.map(({ key, label }) => {
            const count = pipelineStats?.[key] ?? 0;
            const colorCls = STAGE_COLORS[key];
            return (
              <div key={key} className="flex-1 flex flex-col items-center py-1 px-2 first:pl-0 last:pr-0">
                <span className={`text-sm font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${colorCls}`}>
                  {count}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 whitespace-nowrap">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── MetaTag ──────────────────────────────────────────────────────────────────

function MetaTag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-0.5">
      {icon}
      {label}
    </span>
  );
}

// ─── JobTable ─────────────────────────────────────────────────────────────────

function JobTable({
  jobs,
  pipeline,
  onRowClick,
}: {
  jobs: JobListingDto[];
  pipeline: JobPipelineStatsDto;
  onRowClick: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <th className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Title</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Department</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Location</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Applicants</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Posted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {jobs.map((job) => {
            const status = STATUS_CONFIG[job.status] ?? { label: job.status, variant: 'default' as BadgeVariant, dot: 'bg-neutral-400' };
            const total = pipeline[job.id]
              ? Object.values(pipeline[job.id]).reduce((a, b) => a + b, 0)
              : job.applicantCount;
            return (
              <tr
                key={job.id}
                onClick={() => onRowClick(job.id)}
                className="hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
              >
                <td className="px-5 py-3">
                  <span className="font-medium text-[var(--color-text-primary)]">{job.title}</span>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{job.department}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{job.location}</td>
                <td className="px-4 py-3">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-[var(--color-text-muted)] tabular-nums">{total}</td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{formatDate(job.postedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
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
