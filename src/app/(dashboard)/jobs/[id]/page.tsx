'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, MoreHorizontal, MapPin, Briefcase, DollarSign,
  Users, BarChart2, GitBranch, FileText, Loader2,
  Plus, Trash2, CheckCircle2, XCircle, ChevronDown, X,
  Calendar, Building2, ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { ConfirmDeleteModal } from '@/components/ui/ConfirmDeleteModal';
import { WorkflowBuilderModal, type BuilderStage } from '@/components/ui/WorkflowBuilderModal';
import { JobKanbanBoard } from '@/components/jobs/JobKanbanBoard';
import { JobCandidateList } from '@/components/jobs/JobCandidateList';
import {
  jobsApi, usersApi, scorecardsApi,
  type JobDetailDto, type JobPipelineStageCounts,
  type WorkflowStageDto, type JobMemberDto, type UserDto, type ScorecardDto,
} from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

type Tab = 'pipeline' | 'list' | 'details' | 'team' | 'workflow';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'pipeline', label: 'Pipeline',    icon: <BarChart2 size={14} /> },
  { key: 'list',     label: 'List',        icon: <FileText size={14} /> },
  { key: 'details',  label: 'Job Details', icon: <Briefcase size={14} /> },
  { key: 'team',     label: 'Team',        icon: <Users size={14} /> },
  { key: 'workflow', label: 'Workflow',    icon: <GitBranch size={14} /> },
];

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

const MEMBER_ROLES = [
  { value: 'HIRING_MANAGER', label: 'Hiring Manager' },
  { value: 'RECRUITER',      label: 'Recruiter' },
  { value: 'INTERVIEWER',    label: 'Interviewer' },
  { value: 'OBSERVER',       label: 'Observer' },
];

const STAGE_TYPE_LABELS: Record<string, string> = {
  INTERVIEW:  'Interview',
  ASSESSMENT: 'Assessment',
  TASK:       'Task',
  OFFER:      'Offer',
};

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router  = useRouter();
  const { showToast } = useToast();

  const [job,          setJob]          = useState<JobDetailDto | null>(null);
  const [stages,       setStages]       = useState<WorkflowStageDto[]>([]);
  const [members,      setMembers]      = useState<JobMemberDto[]>([]);
  const [stats,        setStats]        = useState<JobPipelineStageCounts | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  const [activeTab,    setActiveTab]    = useState<Tab>('pipeline');
  const [moreOpen,     setMoreOpen]     = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Delete modal
  const [deleteOpen,    setDeleteOpen]   = useState(false);
  const [isDeleting,    setIsDeleting]   = useState(false);
  const [deleteError,   setDeleteError]  = useState('');

  // Close/reopen role
  const [statusLoading, setStatusLoading] = useState(false);

  // Workflow builder
  const [workflowOpen,  setWorkflowOpen] = useState(false);
  const [builderStages, setBuilderStages] = useState<BuilderStage[]>([]);
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  // Add member modal
  const [addMemberOpen,  setAddMemberOpen]  = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [jobRes, stagesRes, membersRes, statsRes] = await Promise.all([
        jobsApi.getJob(id),
        jobsApi.getStages(id).catch(() => ({ stages: [] as WorkflowStageDto[] })),
        jobsApi.getMembers(id).catch(() => ({ members: [] as JobMemberDto[] })),
        jobsApi.getJobPipelineStats(id).catch(() => ({ stats: null })),
      ]);
      setJob(jobRes.job);
      setStages(stagesRes.stages);
      setMembers(membersRes.members);
      setStats(statsRes.stats ?? null);
    } catch {
      setError('Failed to load job. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Close more menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleStatusChange(status: string) {
    setMoreOpen(false);
    setStatusLoading(true);
    try {
      const result = await jobsApi.updateJobStatus(id, status);
      setJob(result.job);
      showToast(status === 'CLOSED' ? 'Role closed' : 'Role reopened', 'success');
    } catch {
      showToast('Failed to update role status', 'error');
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await jobsApi.deleteJob(id);
      showToast('Job deleted', 'success');
      router.push('/jobs');
    } catch {
      setDeleteError('Failed to delete job. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveWorkflow(s: BuilderStage[]) {
    setSavingWorkflow(true);
    try {
      const result = await jobsApi.saveStages(id, s.map(({ stageName, stageType }) => ({ stageName, stageType })));
      setStages(result.stages);
      showToast('Workflow saved', 'success');
    } catch {
      showToast('Failed to save workflow', 'error');
    } finally {
      setSavingWorkflow(false);
      setWorkflowOpen(false);
    }
  }

  function openWorkflowBuilder() {
    setBuilderStages(stages.map((s) => ({
      id: Math.random().toString(36).slice(2),
      stageName: s.stageName,
      stageType: s.stageType,
    })));
    setWorkflowOpen(true);
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalApps = stats
    ? Object.values(stats).reduce((sum, n) => sum + n, 0)
    : job?.applications?.length ?? 0;
  const activeApps   = stats ? (stats.applicationReview + stats.active) : 0;
  const interviews   = stats ? stats.active : 0;
  const offers       = stats ? stats.pendingOffer : 0;

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) return <PageSkeleton />;
  if (error || !job) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600 mb-3">{error || 'Job not found.'}</p>
        <Button variant="secondary" size="sm" onClick={() => loadAll()}>Retry</Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[job.status] ?? { label: job.status, variant: 'default' as BadgeVariant };
  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <>
      <WorkflowBuilderModal
        isOpen={workflowOpen}
        initialStages={builderStages}
        onSave={handleSaveWorkflow}
        onClose={() => setWorkflowOpen(false)}
      />
      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Delete Job Posting"
        description={`Are you sure you want to delete "${job.title}"? This will permanently remove all applications and data associated with this job.`}
        error={deleteError}
      />
      {addMemberOpen && (
        <AddMemberModal
          jobId={id}
          existingMemberIds={members.map((m) => m.user.id)}
          onAdded={(member) => { setMembers((prev) => [...prev, member]); setAddMemberOpen(false); }}
          onClose={() => setAddMemberOpen(false)}
        />
      )}

      <div className="min-h-screen bg-[var(--color-surface)]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-white border-b border-[var(--color-border)] px-8 pt-5 pb-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mb-4">
            <Link href="/jobs" className="flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors">
              <ArrowLeft size={12} /> Jobs
            </Link>
            <span>/</span>
            <span className="text-[var(--color-text-primary)] font-medium truncate max-w-[300px]">{job.title}</span>
          </div>

          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight truncate">
                  {job.title}
                </h1>
                <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm text-[var(--color-text-muted)]">
                {job.department && (
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} className="flex-shrink-0" />
                    {job.department}
                  </span>
                )}
                {job.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="flex-shrink-0" />
                    {job.location}
                  </span>
                )}
                {job.type && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={13} className="flex-shrink-0" />
                    {TYPE_LABELS[job.type] ?? job.type}
                  </span>
                )}
                {salary && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={13} className="flex-shrink-0" />
                    {salary}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {statusLoading && <Loader2 size={15} className="animate-spin text-[var(--color-text-muted)]" />}
              <Button variant="secondary" size="sm" onClick={() => router.push(`/jobs/${id}/edit`)}>
                Edit Job
              </Button>
              <div className="relative" ref={moreRef}>
                <Button variant="secondary" size="sm" onClick={() => setMoreOpen((o) => !o)}>
                  <MoreHorizontal size={15} />
                </Button>
                {moreOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[var(--color-border)] rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    <button
                      onClick={() => { setMoreOpen(false); router.push(`/jobs/${id}/edit`); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2"
                    >
                      <Plus size={14} /> Edit Job
                    </button>
                    <button
                      onClick={() => { setMoreOpen(false); setAddMemberOpen(true); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2"
                    >
                      <Plus size={14} /> Add Candidate
                    </button>
                    {job.status !== 'closed' ? (
                      <button
                        onClick={() => handleStatusChange('CLOSED')}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2"
                      >
                        <XCircle size={14} /> Close Role
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange('OPEN')}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors flex items-center gap-2"
                      >
                        <CheckCircle2 size={14} /> Reopen Role
                      </button>
                    )}
                    <div className="h-px bg-[var(--color-border)] my-1" />
                    <button
                      onClick={() => { setMoreOpen(false); setDeleteError(''); setDeleteOpen(true); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete Job
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-0.5 -mb-px">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-neutral-300',
                  ].join(' ')}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="px-8 py-5 grid grid-cols-4 gap-4">
          <StatCard label="Total Applications" value={totalApps} />
          <StatCard label="Active" value={activeApps} />
          <StatCard label="Interviews" value={interviews} />
          <StatCard label="Offers Sent" value={offers} />
        </div>

        {/* ── Tab content ────────────────────────────────────────────────── */}
        <div className="px-8 pb-12">
          {activeTab === 'pipeline' && <JobKanbanBoard jobId={id} stages={stages} />}
          {activeTab === 'list'     && <JobCandidateList jobId={id} stages={stages} />}
          {activeTab === 'details'  && <DetailsTab job={job} salary={salary} />}
          {activeTab === 'team'     && (
            <TeamTab
              members={members}
              jobId={id}
              onOpenAdd={() => setAddMemberOpen(true)}
              onRemove={async (memberId) => {
                try {
                  await jobsApi.removeMember(id, memberId);
                  setMembers((prev) => prev.filter((m) => m.id !== memberId));
                  showToast('Member removed', 'success');
                } catch {
                  showToast('Failed to remove member', 'error');
                }
              }}
            />
          )}
          {activeTab === 'workflow' && (
            <WorkflowTab
              jobId={id}
              stages={stages}
              savingWorkflow={savingWorkflow}
              onEdit={openWorkflowBuilder}
              onStageUpdated={(updated) =>
                setStages((prev) => prev.map((s) => s.id === updated.id ? updated : s))
              }
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card padding="md">
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">{value}</p>
    </Card>
  );
}

// ─── Details Tab ──────────────────────────────────────────────────────────────

function DetailsTab({ job, salary }: { job: JobDetailDto; salary: string | null }) {
  return (
    <div className="max-w-2xl space-y-5">
      <Card padding="lg">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Job Overview</h2>
        <div className="grid grid-cols-2 gap-3">
          <Detail label="Department" value={job.department} />
          <Detail label="Location" value={job.location} />
          <Detail label="Employment Type" value={TYPE_LABELS[job.type] ?? job.type} />
          <Detail label="Status" value={job.status.charAt(0).toUpperCase() + job.status.slice(1)} />
          {salary && <Detail label="Salary Range" value={salary} />}
          {job.postedAt && <Detail label="Posted" value={formatDate(job.postedAt)} />}
          {job.createdAt && <Detail label="Created" value={formatDate(job.createdAt)} />}
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Description</h2>
        <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">
          {job.description}
        </p>
      </Card>

      {job.requirements && (
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Requirements</h2>
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-line">
            {job.requirements}
          </p>
        </Card>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-muted)] mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab({
  members, jobId, onOpenAdd, onRemove,
}: {
  members: JobMemberDto[];
  jobId: string;
  onOpenAdd: () => void;
  onRemove: (memberId: string) => Promise<void>;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(memberId: string) {
    setRemovingId(memberId);
    await onRemove(memberId);
    setRemovingId(null);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Hiring Team <span className="text-[var(--color-text-muted)] font-normal">({members.length})</span>
        </h2>
        <Button variant="primary" size="sm" onClick={onOpenAdd}>
          <Plus size={13} /> Add Team Member
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-[var(--color-border)]">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mb-4">
            <Users size={20} className="text-[var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">No team members yet</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Add hiring managers, recruiters, and interviewers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const fullName = `${m.user.firstName} ${m.user.lastName}`;
            const roleLabel = MEMBER_ROLES.find((r) => r.value === m.role)?.label ?? m.role;
            return (
              <div key={m.id} className="bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 flex items-center gap-4">
                <Avatar name={fullName} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{fullName}</p>
                  <a href={`mailto:${m.user.email}`} className="text-xs text-blue-600 hover:underline">{m.user.email}</a>
                </div>
                <Badge variant="default">{roleLabel}</Badge>
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={removingId === m.id}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                  aria-label="Remove member"
                >
                  {removingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────

function AddMemberModal({
  jobId, existingMemberIds, onAdded, onClose,
}: {
  jobId: string;
  existingMemberIds: string[];
  onAdded: (member: JobMemberDto) => void;
  onClose: () => void;
}) {
  const [users,       setUsers]       = useState<UserDto[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search,      setSearch]      = useState('');
  const [selectedId,  setSelectedId]  = useState('');
  const [role,        setRole]        = useState('HIRING_MANAGER');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    usersApi.getUsers()
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, []);

  // Escape to close
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = users.filter((u) => {
    if (existingMemberIds.includes(u.id)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  async function handleAdd() {
    if (!selectedId) { setError('Please select a team member.'); return; }
    setSaving(true);
    setError('');
    try {
      const result = await jobsApi.addMember(jobId, { userId: selectedId, role });
      showToast(`${result.member.user.firstName} ${result.member.user.lastName} added to team`, 'success');
      onAdded(result.member);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setSaving(false);
    }
  }

  const SELECT_CLASS =
    'w-full h-10 px-3 text-sm rounded-xl border border-[var(--color-border)] bg-white ' +
    'text-[var(--color-text-primary)] focus:outline-none focus:ring-2 ' +
    'focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-shadow appearance-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)] flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Add Team Member</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedId(''); }}
              className="w-full h-10 pl-4 pr-4 text-sm rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-shadow"
            />
          </div>

          {/* User list */}
          {usersLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] py-4">
              <Loader2 size={14} className="animate-spin" /> Loading team members…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
              {search ? 'No matching users found.' : 'All users are already on this team.'}
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {filtered.map((u) => {
                const name = `${u.firstName} ${u.lastName}`;
                const isSelected = selectedId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedId(u.id)}
                    className={[
                      'w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors',
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] hover:border-neutral-300 hover:bg-[var(--color-surface)]',
                    ].join(' ')}
                  >
                    <Avatar name={name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{name}</p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{u.email}</p>
                    </div>
                    {isSelected && <CheckCircle2 size={16} className="text-[var(--color-primary)] ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Role</label>
            <div className="relative">
              <select value={role} onChange={(e) => setRole(e.target.value)} className={SELECT_CLASS}>
                {MEMBER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" size="md" onClick={handleAdd} isLoading={saving} disabled={!selectedId}>
            Add Member
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Workflow Tab ─────────────────────────────────────────────────────────────

function WorkflowTab({
  jobId, stages, savingWorkflow, onEdit, onStageUpdated,
}: {
  jobId: string;
  stages: WorkflowStageDto[];
  savingWorkflow: boolean;
  onEdit: () => void;
  onStageUpdated: (stage: WorkflowStageDto) => void;
}) {
  const [attachStage, setAttachStage] = useState<WorkflowStageDto | null>(null);
  const { showToast } = useToast();

  async function handleRemoveScorecard(stage: WorkflowStageDto) {
    try {
      const result = await jobsApi.updateStageScorecard(jobId, stage.id, null);
      onStageUpdated(result.stage);
      showToast('Scorecard removed', 'success');
    } catch {
      showToast('Failed to remove scorecard', 'error');
    }
  }

  return (
    <div className="max-w-2xl">
      {attachStage && (
        <AttachScorecardModal
          jobId={jobId}
          stage={attachStage}
          onAttached={(updated) => { onStageUpdated(updated); setAttachStage(null); }}
          onClose={() => setAttachStage(null)}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Interview Stages <span className="text-[var(--color-text-muted)] font-normal">({stages.length})</span>
        </h2>
        <Button variant="secondary" size="sm" onClick={onEdit} isLoading={savingWorkflow}>
          <GitBranch size={13} />
          {stages.length > 0 ? 'Edit Workflow' : 'Configure Workflow'}
        </Button>
      </div>

      {stages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-[var(--color-border)]">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mb-4">
            <GitBranch size={20} className="text-[var(--color-text-muted)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">No workflow configured</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 mb-4">Define the stages candidates move through for this role</p>
          <Button variant="primary" size="sm" onClick={onEdit}>Configure Workflow</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, i) => (
            <div key={stage.id} className="bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[var(--color-primary)]">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{stage.stageName}</p>
                {stage.description && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{stage.description}</p>
                )}
              </div>
              <Badge variant="default">{STAGE_TYPE_LABELS[stage.stageType] ?? stage.stageType}</Badge>

              {/* Scorecard column */}
              {stage.scorecardId ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setAttachStage(stage)}
                    className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <ClipboardList size={12} />
                    {stage.scorecardName ?? 'Scorecard'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveScorecard(stage)}
                    className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Remove scorecard"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAttachStage(stage)}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] px-2.5 py-1 rounded-lg hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors flex-shrink-0"
                >
                  <ClipboardList size={12} />
                  Attach Scorecard
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Attach Scorecard Modal ────────────────────────────────────────────────────

function AttachScorecardModal({
  jobId, stage, onAttached, onClose,
}: {
  jobId: string;
  stage: WorkflowStageDto;
  onAttached: (updated: WorkflowStageDto) => void;
  onClose: () => void;
}) {
  const [scorecards,  setScorecards]  = useState<ScorecardDto[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState(stage.scorecardId ?? '');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    scorecardsApi.getAll()
      .then((r) => setScorecards(r.scorecards))
      .catch(() => setScorecards([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSave() {
    if (!selectedId) { setError('Please select a scorecard.'); return; }
    setSaving(true);
    setError('');
    try {
      const result = await jobsApi.updateStageScorecard(jobId, stage.id, selectedId);
      showToast('Scorecard attached', 'success');
      onAttached(result.stage);
    } catch {
      setError('Failed to attach scorecard. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border)] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Attach Scorecard</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Stage: {stage.stageName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] py-4">
              <Loader2 size={14} className="animate-spin" /> Loading scorecards…
            </div>
          ) : scorecards.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
              No scorecards found. Create one in{' '}
              <a href="/settings/scorecards" className="text-blue-600 hover:underline">Settings → Scorecards</a>.
            </p>
          ) : (
            <div className="space-y-2">
              {scorecards.map((sc) => {
                const isSelected = selectedId === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSelectedId(sc.id)}
                    className={[
                      'w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-colors',
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] hover:border-neutral-300 hover:bg-[var(--color-surface)]',
                    ].join(' ')}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ClipboardList size={14} className="text-[var(--color-text-muted)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{sc.name}</p>
                      {sc.description && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{sc.description}</p>
                      )}
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{sc.criteriaCount} criteria</p>
                    </div>
                    {isSelected && <CheckCircle2 size={16} className="text-[var(--color-primary)] flex-shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>
          )}
          {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border)] flex-shrink-0">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" size="md" onClick={handleSave} isLoading={saving} disabled={!selectedId || loading}>
            Attach Scorecard
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] animate-pulse">
      <div className="bg-white border-b border-[var(--color-border)] px-8 pt-5 pb-0">
        <div className="h-3 w-28 bg-neutral-200 rounded mb-4" />
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-64 bg-neutral-200 rounded-lg" />
              <div className="h-5 w-16 bg-neutral-200 rounded-full" />
            </div>
            <div className="flex items-center gap-4">
              {[80, 120, 70].map((w, i) => <div key={i} className="h-4 bg-neutral-200 rounded" style={{ width: w }} />)}
            </div>
          </div>
          <div className="h-8 w-8 bg-neutral-200 rounded-xl" />
        </div>
        <div className="flex gap-1 pt-1">
          {[80, 60, 90, 60, 80].map((w, i) => <div key={i} className="h-10 bg-neutral-200 rounded-t-lg" style={{ width: w }} />)}
        </div>
      </div>
      <div className="px-8 py-5 grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
            <div className="h-3 w-24 bg-neutral-200 rounded mb-2" />
            <div className="h-8 w-12 bg-neutral-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
