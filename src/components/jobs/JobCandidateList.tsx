'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronUp, Loader2, Star, Calendar, Mail, ChevronsUpDown,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  jobsApi, applicationsApi,
  type WorkflowStageDto, type PipelineApplicationDto,
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SortKey = 'candidateName' | 'appliedAt' | 'score' | 'stage';
type SortDir = 'asc' | 'desc';

function scoreColor(score: number) {
  return score >= 85 ? 'text-emerald-600' : score >= 70 ? 'text-amber-500' : 'text-neutral-400';
}

// ─── MoveStageDropdown ────────────────────────────────────────────────────────

function MoveStageDropdown({
  appId, currentStage, stages, onMoved,
}: {
  appId: string;
  currentStage: string | null;
  stages: WorkflowStageDto[];
  onMoved: (appId: string, newStage: string) => void;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  async function handleSelect(stageName: string) {
    if (stageName === currentStage) { setOpen(false); return; }
    setOpen(false);
    setMoving(true);
    try {
      await applicationsApi.updateSubStage(appId, stageName);
      onMoved(appId, stageName);
      showToast(`Moved to ${stageName}`, 'success');
    } catch {
      showToast('Failed to move candidate', 'error');
    } finally {
      setMoving(false);
    }
  }

  const label = currentStage ?? stages[0]?.stageName ?? '—';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={moving}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-neutral-300 hover:bg-[var(--color-surface)] transition-colors text-[var(--color-text-primary)] whitespace-nowrap"
      >
        {moving ? <Loader2 size={11} className="animate-spin" /> : null}
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown size={11} className={`flex-shrink-0 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden min-w-[160px]">
            {stages.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelect(s.stageName)}
                className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--color-surface)] ${s.stageName === currentStage ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}
              >
                {s.stageName}
                {s.stageName === currentStage && <span className="ml-1 text-[10px]">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SortHeader ───────────────────────────────────────────────────────────────

function SortHeader({
  label, sortKey, currentKey, direction, onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  direction: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
    >
      {label}
      {active ? (
        direction === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
      ) : (
        <ChevronsUpDown size={11} className="opacity-40" />
      )}
    </button>
  );
}

// ─── JobCandidateList ─────────────────────────────────────────────────────────

export function JobCandidateList({
  jobId, stages,
}: {
  jobId: string;
  stages: WorkflowStageDto[];
}) {
  const [applications, setApplications] = useState<PipelineApplicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('appliedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await jobsApi.getJobApplications(jobId);
      setApplications(res.applications);
    } catch {
      setError('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  // Reset stage filter if selected stage no longer exists (e.g. workflow edited)
  useEffect(() => {
    if (stageFilter && !stages.some((s) => s.stageName === stageFilter)) {
      setStageFilter('');
    }
  }, [stages, stageFilter]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function handleMoved(appId: string, newStage: string) {
    setApplications((prev) =>
      prev.map((a) => a.id === appId ? { ...a, stage: newStage } : a)
    );
  }

  const filtered = useMemo(() => applications
    .filter((a) => {
      const q = search.toLowerCase();
      if (q && !a.candidateName.toLowerCase().includes(q) && !a.candidateEmail.toLowerCase().includes(q)) return false;
      if (stageFilter && a.stage !== stageFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'candidateName') cmp = a.candidateName.localeCompare(b.candidateName);
      else if (sortKey === 'appliedAt') cmp = new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime();
      else if (sortKey === 'score') cmp = a.score - b.score;
      else if (sortKey === 'stage') cmp = (a.stage ?? '').localeCompare(b.stage ?? '');
      return sortDir === 'asc' ? cmp : -cmp;
    }), [applications, search, stageFilter, sortKey, sortDir]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchApplications}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search candidates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
        </div>

        {stages.length > 0 && (
          <div className="relative">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="h-9 pl-3 pr-8 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 appearance-none cursor-pointer"
            >
              <option value="">All stages</option>
              {stages.map((s) => (
                <option key={s.id} value={s.stageName}>{s.stageName}</option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          </div>
        )}

        <p className="text-xs text-[var(--color-text-muted)] ml-auto">
          {filtered.length} of {applications.length}
        </p>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] py-16 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {applications.length === 0 ? 'No candidates have applied yet.' : 'No candidates match your filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <SortHeader label="Candidate" sortKey="candidateName" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            <SortHeader label="Stage" sortKey="stage" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            <SortHeader label="Applied" sortKey="appliedAt" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            <SortHeader label="Score" sortKey="score" currentKey={sortKey} direction={sortDir} onSort={handleSort} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Move</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((app) => (
              <div
                key={app.id}
                className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-[var(--color-surface)]/50 transition-colors"
              >
                {/* Candidate */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={app.candidateName} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{app.candidateName}</p>
                    <a href={`mailto:${app.candidateEmail}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate">
                      <Mail size={10} className="flex-shrink-0" />
                      {app.candidateEmail}
                    </a>
                  </div>
                </div>

                {/* Stage */}
                <div className="min-w-0">
                  <p className="text-xs text-[var(--color-text-primary)] truncate">
                    {app.stage ?? stages[0]?.stageName ?? '—'}
                  </p>
                  {app.skills.length > 0 && (
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">
                      {app.skills.slice(0, 3).join(', ')}{app.skills.length > 3 ? ` +${app.skills.length - 3}` : ''}
                    </p>
                  )}
                </div>

                {/* Applied */}
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <Calendar size={10} />
                  {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>

                {/* Score */}
                <div className={`flex items-center gap-1 text-xs font-bold ${scoreColor(app.score)}`}>
                  <Star size={10} fill="currentColor" />
                  {app.score}
                </div>

                {/* Move */}
                <MoveStageDropdown
                  appId={app.id}
                  currentStage={app.stage}
                  stages={stages}
                  onMoved={handleMoved}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
