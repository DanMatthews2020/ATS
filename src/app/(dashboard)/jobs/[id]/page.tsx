'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronRight, ExternalLink, MoreHorizontal,
  Search, SlidersHorizontal, Loader2, X, Check,
  Users, Award, MapPin, Briefcase, DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import {
  jobsApi,
  type JobDetailDto,
  type JobListingDto,
  type JobPipelineStageCounts,
  type PipelineApplicationDto,
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { BadgeVariant } from '@/types';

// ─── Types & Config ───────────────────────────────────────────────────────────

type PipelineStageKey = 'leads' | 'applicationReview' | 'active' | 'pendingOffer' | 'hired' | 'archived';

const PIPELINE_STAGES: { key: PipelineStageKey; label: string; apiStage: string; description: string }[] = [
  { key: 'leads',             label: 'Leads',               apiStage: 'leads',               description: 'Sourced candidates' },
  { key: 'applicationReview', label: 'Application Review',  apiStage: 'application-review',  description: 'Applied' },
  { key: 'active',            label: 'Active',              apiStage: 'active',              description: 'In interview process' },
  { key: 'pendingOffer',      label: 'Pending Offer',       apiStage: 'pending-offer',       description: 'Offer sent' },
  { key: 'hired',             label: 'Hired',               apiStage: 'hired',               description: 'Signed' },
  { key: 'archived',          label: 'Archived',            apiStage: 'archived',            description: 'Removed from process' },
];

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

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

// ─── Kanban helpers ───────────────────────────────────────────────────────────

interface KanbanCol { label: string; candidates: PipelineApplicationDto[] }

function groupBySubStage(candidates: PipelineApplicationDto[]): KanbanCol[] {
  if (candidates.length === 0) return [];
  const map = new Map<string, PipelineApplicationDto[]>();
  for (const c of candidates) {
    const key = c.stage ?? 'General';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  return Array.from(map.entries()).map(([label, cs]) => ({ label, candidates: cs }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { showToast } = useToast();

  // Core data
  const [job, setJob]               = useState<JobDetailDto | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError]     = useState('');

  // Pipeline stats (per-job)
  const [pipelineStats, setPipelineStats] = useState<JobPipelineStageCounts | null>(null);
  const [statsLoading, setStatsLoading]   = useState(true);

  // Candidates for the active stage
  const [candidates, setCandidates]             = useState<PipelineApplicationDto[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError]   = useState('');

  // UI
  const [activeStage, setActiveStage]             = useState<PipelineStageKey>('applicationReview');
  const [search, setSearch]                       = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [jobSwitcherOpen, setJobSwitcherOpen]     = useState(false);
  const [moreMenuOpen, setMoreMenuOpen]           = useState(false);
  const [allJobs, setAllJobs]                     = useState<JobListingDto[]>([]);
  const [allJobsLoaded, setAllJobsLoaded]         = useState(false);
  const [closing, setClosing]                     = useState(false);

  const switcherRef = useRef<HTMLDivElement>(null);
  const moreRef     = useRef<HTMLDivElement>(null);

  // ── Fetch job + pipeline stats ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setJobLoading(true);
      setStatsLoading(true);
      try {
        const [jobResult, statsResult] = await Promise.all([
          jobsApi.getJob(id),
          jobsApi.getJobPipelineStats(id),
        ]);
        setJob(jobResult.job);
        setPipelineStats(statsResult.stats);
      } catch {
        setJobError('Failed to load job posting.');
      } finally {
        setJobLoading(false);
        setStatsLoading(false);
      }
    }
    load();
  }, [id]);

  // ── Fetch candidates when stage changes ───────────────────────────────────
  const loadCandidates = useCallback(async (stage: PipelineStageKey) => {
    const apiStage = PIPELINE_STAGES.find((s) => s.key === stage)?.apiStage ?? stage;
    setCandidatesLoading(true);
    setCandidatesError('');
    try {
      const result = await jobsApi.getJobCandidates(id, apiStage);
      setCandidates(result.candidates);
    } catch {
      setCandidatesError('Failed to load candidates.');
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  }, [id]);

  useEffect(() => { loadCandidates(activeStage); }, [activeStage, loadCandidates]);

  // ── Load all jobs for switcher (lazy) ────────────────────────────────────
  async function openJobSwitcher() {
    setJobSwitcherOpen((o) => !o);
    if (!allJobsLoaded) {
      try {
        const result = await jobsApi.getJobs(1, 100);
        setAllJobs(result.items);
        setAllJobsLoaded(true);
      } catch { /* silently fail */ }
    }
  }

  // ── Close role ────────────────────────────────────────────────────────────
  async function handleCloseRole() {
    setClosing(true);
    try {
      const result = await jobsApi.updateJobStatus(id, 'CLOSED');
      setJob(result.job);
      showToast('Role closed', 'success');
      setMoreMenuOpen(false);
    } catch {
      showToast('Failed to close role', 'error');
    } finally {
      setClosing(false);
    }
  }

  // ── Outside-click to close dropdowns ─────────────────────────────────────
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setJobSwitcherOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────
  const filtered = search
    ? candidates.filter((c) => c.candidateName.toLowerCase().includes(search.toLowerCase()))
    : candidates;
  const kanbanCols = groupBySubStage(filtered);

  // ── Loading / error ───────────────────────────────────────────────────────
  if (jobLoading) return <PageSkeleton />;

  if (jobError || !job) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600 mb-3">{jobError || 'Job not found.'}</p>
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[job.status] ?? { label: job.status, variant: 'default' as BadgeVariant, dot: 'bg-neutral-400' };
  const salary    = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ─── Section 1: Header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[var(--color-border)] px-8 pt-5 pb-4 flex-shrink-0">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mb-3">
          <Link href="/jobs" className="hover:text-[var(--color-text-primary)] transition-colors">
            Jobs
          </Link>
          <ChevronRight size={12} />
          <span className="text-[var(--color-text-primary)] font-medium truncate max-w-[240px]">
            {job.title}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">

          {/* Left: title + badge */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Job-switcher trigger */}
            <div className="relative" ref={switcherRef}>
              <button
                onClick={openJobSwitcher}
                className="flex items-center gap-2 hover:bg-[var(--color-surface)] rounded-xl px-3 py-1.5 transition-colors -ml-3 group"
              >
                <h1 className="text-xl font-bold text-[var(--color-text-primary)] leading-tight truncate max-w-[360px]">
                  {job.title}
                </h1>
                <ChevronDown
                  size={16}
                  className={`text-[var(--color-text-muted)] flex-shrink-0 transition-transform ${jobSwitcherOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Switcher dropdown */}
              {jobSwitcherOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-80 bg-white border border-[var(--color-border)] rounded-2xl shadow-lg z-50 py-1.5 max-h-60 overflow-y-auto">
                  {!allJobsLoaded ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--color-text-muted)]">
                      <Loader2 size={13} className="animate-spin" /> Loading…
                    </div>
                  ) : allJobs.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No other jobs</div>
                  ) : (
                    allJobs.map((j) => (
                      <button
                        key={j.id}
                        onClick={() => { setJobSwitcherOpen(false); router.push(`/jobs/${j.id}`); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                          j.id === id
                            ? 'text-[var(--color-primary)] font-semibold bg-[var(--color-primary)]/5'
                            : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
                        }`}
                      >
                        <span className="truncate">{j.title}</span>
                        {j.id === id && <Check size={13} className="flex-shrink-0 text-[var(--color-primary)]" />}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Status badge */}
            <Badge variant={statusCfg.variant}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${statusCfg.dot}`} />
              {statusCfg.label}
            </Badge>

            {/* Metadata tags */}
            <div className="hidden lg:flex items-center gap-2">
              <MetaTag icon={<MapPin size={11} />} label={job.location} />
              <MetaTag icon={<Briefcase size={11} />} label={TYPE_LABELS[job.type] ?? job.type} />
              {salary && <MetaTag icon={<DollarSign size={11} />} label={salary} />}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={() => showToast('Job board link — coming soon', 'info')}>
              <ExternalLink size={13} />
              Job Board
            </Button>

            {/* More menu */}
            <div className="relative" ref={moreRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setMoreMenuOpen((o) => !o)}
                className={moreMenuOpen ? '!border-[var(--color-primary)] !bg-[var(--color-primary)]/5' : ''}
              >
                <MoreHorizontal size={15} />
              </Button>

              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-[var(--color-border)] rounded-2xl shadow-lg z-50 py-1.5">
                  <button
                    onClick={() => { setMoreMenuOpen(false); showToast('Edit — coming soon', 'info'); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
                  >
                    Edit job
                  </button>
                  {job.status !== 'closed' && (
                    <button
                      onClick={handleCloseRole}
                      disabled={closing}
                      className="w-full text-left px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-2"
                    >
                      {closing && <Loader2 size={12} className="animate-spin" />}
                      Close role
                    </button>
                  )}
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <button
                    onClick={() => { setMoreMenuOpen(false); showToast('Delete — coming soon', 'info'); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete job
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Section 2: Stage tabs ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-[var(--color-border)] px-8 flex-shrink-0">
        <div className="flex items-center gap-0 overflow-x-auto">
          {PIPELINE_STAGES.map((stage) => {
            const count    = pipelineStats?.[stage.key] ?? 0;
            const isActive = activeStage === stage.key;
            return (
              <button
                key={stage.key}
                onClick={() => { setActiveStage(stage.key); setSearch(''); }}
                title={stage.description}
                className={[
                  'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-neutral-300',
                ].join(' ')}
              >
                {stage.label}
                <span className={[
                  'inline-flex items-center justify-center text-xs font-semibold tabular-nums rounded-full px-1.5 min-w-[20px] h-5',
                  isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]',
                ].join(' ')}>
                  {statsLoading ? '·' : count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Section 3: Candidate area ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-[var(--color-surface)]/40 p-8">

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
            <Input
              placeholder="Search candidates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <Button
            variant={showAdvancedFilters ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setShowAdvancedFilters((o) => !o)}
          >
            <SlidersHorizontal size={13} />
            Advanced Filters
          </Button>

          <span className="text-xs text-[var(--color-text-muted)] ml-auto">
            {candidatesLoading ? '' : `${filtered.length} candidate${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Advanced filters panel */}
        {showAdvancedFilters && (
          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 mb-5 shadow-card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Location', 'Skills', 'Score', 'Applied Date'].map((label) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{label}</label>
                  <Input placeholder={`Filter by ${label.toLowerCase()}…`} className="h-8 text-xs" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kanban */}
        {candidatesLoading ? (
          <KanbanSkeleton />
        ) : candidatesError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-red-600 mb-3">{candidatesError}</p>
            <Button variant="secondary" size="sm" onClick={() => loadCandidates(activeStage)}>Retry</Button>
          </div>
        ) : kanbanCols.length === 0 ? (
          <EmptyStage stage={PIPELINE_STAGES.find((s) => s.key === activeStage)!} />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 items-start">
            {kanbanCols.map((col) => (
              <KanbanColumn key={col.label} col={col} jobId={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MetaTag ──────────────────────────────────────────────────────────────────

function MetaTag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-0.5">
      {icon}{label}
    </span>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({ col, jobId }: { col: KanbanCol; jobId: string }) {
  return (
    <div className="flex-shrink-0 w-72 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3">
      <div className="flex items-center justify-between px-1 mb-3">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{col.label}</span>
        <span className="text-xs font-semibold tabular-nums bg-white border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-full px-2 py-0.5">
          {col.candidates.length}
        </span>
      </div>
      <div className="space-y-2">
        {col.candidates.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}

// ─── CandidateCard ────────────────────────────────────────────────────────────

function CandidateCard({ candidate }: { candidate: PipelineApplicationDto }) {
  return (
    <Link href={`/candidates/${candidate.candidateId}`}>
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-3.5 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all cursor-pointer">

        {/* Name + avatar */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <Avatar name={candidate.candidateName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-tight">
              {candidate.candidateName}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{candidate.candidateEmail}</p>
          </div>
        </div>

        {/* Skills */}
        {candidate.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {candidate.skills.slice(0, 3).map((skill) => (
              <span
                key={skill}
                className="text-[10px] px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md text-[var(--color-text-muted)] leading-tight"
              >
                {skill}
              </span>
            ))}
            {candidate.skills.length > 3 && (
              <span className="text-[10px] text-[var(--color-text-muted)] self-center">
                +{candidate.skills.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            <Award size={10} />
            {candidate.interviewCount} interview{candidate.interviewCount !== 1 ? 's' : ''}
          </span>
          {candidate.score > 0 && (
            <span className={`text-xs font-bold tabular-nums ${
              candidate.score >= 80 ? 'text-emerald-600' :
              candidate.score >= 60 ? 'text-amber-600' : 'text-[var(--color-text-muted)]'
            }`}>
              {candidate.score}%
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── EmptyStage ───────────────────────────────────────────────────────────────

function EmptyStage({ stage }: { stage: { label: string; description: string } }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-xl bg-white border border-[var(--color-border)] flex items-center justify-center mb-4 shadow-card">
        <Users size={20} className="text-[var(--color-text-muted)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">No candidates in {stage.label}</p>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">{stage.description}</p>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex flex-col flex-1 animate-pulse">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-border)] px-8 pt-5 pb-4">
        <div className="h-3 w-28 bg-neutral-200 rounded mb-3" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-52 bg-neutral-200 rounded-lg" />
            <div className="h-5 w-16 bg-neutral-200 rounded-full" />
            <div className="h-5 w-20 bg-neutral-200 rounded-full hidden lg:block" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-neutral-200 rounded-xl" />
            <div className="h-8 w-8 bg-neutral-200 rounded-xl" />
          </div>
        </div>
      </div>
      {/* Tabs */}
      <div className="bg-white border-b border-[var(--color-border)] px-8">
        <div className="flex gap-6 py-3.5">
          {[120, 150, 80, 120, 70, 90].map((w, i) => (
            <div key={i} className="h-4 bg-neutral-200 rounded" style={{ width: w }} />
          ))}
        </div>
      </div>
      {/* Kanban */}
      <div className="flex-1 p-8">
        <KanbanSkeleton />
      </div>
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 animate-pulse">
      {[3, 4, 2].map((rows, ci) => (
        <div key={ci} className="flex-shrink-0 w-72 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3">
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="h-4 w-20 bg-neutral-200 rounded" />
            <div className="h-4 w-6 bg-neutral-200 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: rows }).map((_, ri) => (
              <div key={ri} className="bg-white border border-[var(--color-border)] rounded-xl p-3.5">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-7 h-7 bg-neutral-200 rounded-full flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-28 bg-neutral-200 rounded mb-1.5" />
                    <div className="h-2.5 w-36 bg-neutral-200 rounded" />
                  </div>
                </div>
                <div className="flex gap-1 mb-2.5">
                  {[40, 52, 36].map((w, si) => (
                    <div key={si} className="h-4 bg-neutral-200 rounded" style={{ width: w }} />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-3 w-16 bg-neutral-200 rounded" />
                  <div className="h-3 w-8 bg-neutral-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
