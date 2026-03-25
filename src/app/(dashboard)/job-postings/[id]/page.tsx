'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, MapPin, Briefcase, Users, Calendar, Clock,
  Copy, Share2, X, Check, Loader2, Award,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { jobsApi, applicationsApi, type JobDetailDto, type JobApplicantDto } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { BadgeVariant } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  open:      { label: 'Open',    variant: 'success' },
  draft:     { label: 'Draft',   variant: 'default' },
  closed:    { label: 'Closed',  variant: 'error' },
  'on-hold': { label: 'On Hold', variant: 'warning' },
};

const APP_STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  applied:   { label: 'Applied',   variant: 'info' },
  screening: { label: 'Screening', variant: 'default' },
  interview: { label: 'Interview', variant: 'warning' },
  offer:     { label: 'Offer',     variant: 'success' },
  hired:     { label: 'Hired',     variant: 'success' },
  rejected:  { label: 'Rejected',  variant: 'error' },
};

const STAGE_ORDER = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

const TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract:    'Contract',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSalary(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

// ─── Move Stage Modal ─────────────────────────────────────────────────────────

interface MoveStageModalProps {
  appId: string;
  currentStatus: string;
  candidateName: string;
  onClose: () => void;
  onMoved: (appId: string, newStatus: string) => void;
}

function MoveStageModal({ appId, currentStatus, candidateName, onClose, onMoved }: MoveStageModalProps) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  const statusToEnum: Record<string, string> = {
    applied:   'APPLIED',
    screening: 'SCREENING',
    interview: 'INTERVIEW',
    offer:     'OFFER',
    hired:     'HIRED',
    rejected:  'REJECTED',
  };

  async function handleSave() {
    if (selected === currentStatus) { onClose(); return; }
    setSaving(true);
    try {
      await applicationsApi.updateStage(appId, statusToEnum[selected] ?? selected.toUpperCase());
      onMoved(appId, selected);
      showToast('Stage updated', 'success');
      onClose();
    } catch {
      showToast('Failed to update stage', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-primary)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Move Stage</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">{candidateName}</p>
        <div className="space-y-2 mb-6">
          {STAGE_ORDER.map((stage) => {
            const cfg = APP_STATUS_CONFIG[stage];
            const isCurrent = stage === currentStatus;
            const isSelected = stage === selected;
            return (
              <button
                key={stage}
                onClick={() => setSelected(stage)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-colors ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isSelected ? (
                    <div className="w-4 h-4 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--color-border)]" />
                  )}
                  <Badge variant={cfg.variant}>{cfg.label}</Badge>
                </div>
                {isCurrent && <span className="text-xs text-[var(--color-text-muted)]">current</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Applicant Row ────────────────────────────────────────────────────────────

interface ApplicantRowProps {
  app: JobApplicantDto;
  onMoveStage: (app: JobApplicantDto) => void;
}

function ApplicantRow({ app, onMoveStage }: ApplicantRowProps) {
  const statusCfg = APP_STATUS_CONFIG[app.status] ?? { label: app.status, variant: 'default' as BadgeVariant };
  return (
    <tr className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={app.candidateName} size="sm" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{app.candidateName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{app.candidateEmail}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
      </td>
      <td className="py-3 px-4 text-xs text-[var(--color-text-muted)] hidden sm:table-cell">
        {app.stage ?? '—'}
      </td>
      <td className="py-3 px-4 text-xs text-[var(--color-text-muted)] hidden md:table-cell">
        {app.interviewCount > 0 ? (
          <span className="flex items-center gap-1">
            <Award size={11} /> {app.interviewCount}
          </span>
        ) : '—'}
      </td>
      <td className="py-3 px-4 text-xs text-[var(--color-text-muted)] hidden md:table-cell">
        {formatDate(app.lastUpdated)}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Link href={`/candidates/${app.candidateId}`}>
            <span className="text-xs text-[var(--color-primary)] hover:underline font-medium cursor-pointer whitespace-nowrap">
              View Profile
            </span>
          </Link>
          <span className="text-[var(--color-border)]">·</span>
          <button
            onClick={() => onMoveStage(app)}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-medium whitespace-nowrap"
          >
            Move Stage
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { showToast } = useToast();

  const [job, setJob]             = useState<JobDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');
  const [closing, setClosing]     = useState(false);
  const [stageModal, setStageModal] = useState<JobApplicantDto | null>(null);

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

  async function handleCloseRole() {
    if (!job) return;
    setClosing(true);
    try {
      const result = await jobsApi.updateJobStatus(id, 'CLOSED');
      setJob(result.job);
      showToast('Role closed successfully', 'success');
    } catch {
      showToast('Failed to close role', 'error');
    } finally {
      setClosing(false);
    }
  }

  function handleShareLink() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => showToast('Link copied to clipboard', 'success'))
        .catch(() => showToast('Failed to copy link', 'error'));
    } else {
      showToast('Clipboard not available', 'error');
    }
  }

  function handleStageUpdated(appId: string, newStatus: string) {
    setJob((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        applications: prev.applications.map((a) =>
          a.id === appId ? { ...a, status: newStatus } : a
        ),
      };
    });
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
        >
          <ArrowLeft size={14} /> Back to Job Postings
        </button>
        <p className="text-sm text-red-600">{error || 'Job posting not found.'}</p>
      </div>
    );
  }

  // ── Derived stats ──────────────────────────────────────────────────────────

  const statusCfg   = STATUS_CONFIG[job.status] ?? { label: job.status, variant: 'default' as BadgeVariant };
  const inReview    = job.applications.filter((a) => a.status === 'screening').length;
  const interviewing = job.applications.filter((a) => a.status === 'interview').length;
  const offersSent  = job.applications.filter((a) => ['offer', 'hired'].includes(a.status)).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-5xl">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} /> Back to Job Postings
      </button>

      {/* Header */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{job.title}</h1>
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
              <span className="text-xs px-2 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)]">
                {TYPE_LABELS[job.type] ?? job.type}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1.5"><MapPin size={13} />{job.location}</span>
              <span className="flex items-center gap-1.5"><Briefcase size={13} />{job.department}</span>
              <span className="flex items-center gap-1.5"><Calendar size={13} />Posted {formatDate(job.postedAt)}</span>
              <span className="flex items-center gap-1.5"><Clock size={13} />By {job.createdByName}</span>
            </div>
            {(job.salaryMin || job.salaryMax) && (
              <p className="text-sm text-[var(--color-text-muted)] mt-2">
                Salary:{' '}
                {job.salaryMin && job.salaryMax
                  ? `${formatSalary(job.salaryMin)} – ${formatSalary(job.salaryMax)}`
                  : job.salaryMin
                  ? `From ${formatSalary(job.salaryMin)}`
                  : `Up to ${formatSalary(job.salaryMax!)}`}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <Button variant="secondary" size="sm" onClick={handleShareLink}>
              <Share2 size={13} /> Share
            </Button>
            <Button variant="secondary" size="sm" onClick={() => showToast('Duplicate — coming soon', 'info')}>
              <Copy size={13} /> Duplicate
            </Button>
            <Button variant="secondary" size="sm" onClick={() => showToast('Edit — coming soon', 'info')}>
              Edit
            </Button>
            {job.status !== 'closed' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseRole}
                disabled={closing}
                className="!text-red-600 !border-red-200 hover:!bg-red-50"
              >
                {closing ? <Loader2 size={13} className="animate-spin" /> : null}
                Close Role
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Applicants', value: job.applicantCount, icon: <Users size={14} /> },
          { label: 'In Review',        value: inReview,            icon: <Clock size={14} /> },
          { label: 'Interviewing',     value: interviewing,        icon: <Calendar size={14} /> },
          { label: 'Offers Sent',      value: offersSent,          icon: <Award size={14} /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
              <span className="text-[var(--color-text-muted)]">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">

        {/* Left — applicant table */}
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
            Applicants
            {job.applications.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                ({job.applications.length})
              </span>
            )}
          </h2>

          {job.applications.length === 0 ? (
            <Card padding="lg">
              <p className="text-sm text-[var(--color-text-muted)] text-center py-10">No applicants yet.</p>
            </Card>
          ) : (
            <div className="bg-white border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-card">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--color-surface)]">
                    <th className="py-2.5 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Candidate</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Stage</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hidden sm:table-cell">Pipeline</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hidden md:table-cell">Interviews</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hidden md:table-cell">Updated</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {job.applications.map((app) => (
                    <ApplicantRow key={app.id} app={app} onMoveStage={(a) => setStageModal(a)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right — description sidebar */}
        <div className="space-y-4">
          <Card padding="lg">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Description</h3>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
              {job.description}
            </p>
          </Card>

          {job.requirements && (
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Requirements</h3>
              <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                {job.requirements}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Move Stage Modal */}
      {stageModal && (
        <MoveStageModal
          appId={stageModal.id}
          currentStatus={stageModal.status}
          candidateName={stageModal.candidateName}
          onClose={() => setStageModal(null)}
          onMoved={handleStageUpdated}
        />
      )}
    </div>
  );
}
