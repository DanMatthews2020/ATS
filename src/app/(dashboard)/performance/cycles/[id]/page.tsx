'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Calendar, Clock, Users, CheckCircle2, Star, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { performanceApi, type ReviewCycleDto, type CycleParticipantDto } from '@/lib/api';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CycleDetailPage({ params }: { params: { id: string } }) {
  const { id }   = params;
  const router   = useRouter();
  const { showToast } = useToast();

  const [cycle,   setCycle]   = useState<ReviewCycleDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('All');

  useEffect(() => {
    performanceApi.getCycle(id)
      .then(({ cycle: c }) => setCycle(c))
      .catch(() => showToast('Failed to load cycle', 'error'))
      .finally(() => setLoading(false));
  }, [id, showToast]);

  if (loading) return <LoadingSkeleton />;
  if (!cycle) return (
    <div className="p-8">
      <p className="text-[var(--color-text-muted)]">Cycle not found.</p>
    </div>
  );

  const total     = cycle.participants.length;
  const completed = cycle.participants.filter((p) => p.reviewStatus === 'completed').length;
  const inProg    = cycle.participants.filter((p) => p.reviewStatus === 'in-progress').length;
  const notStart  = cycle.participants.filter((p) => p.reviewStatus === 'not-started').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const avgScore  = completed > 0
    ? (cycle.participants.filter((p) => p.score !== null).reduce((s, p) => s + (p.score ?? 0), 0) / completed).toFixed(1)
    : '—';

  const departments = ['All', ...Array.from(new Set(cycle.participants.map((p) => p.department)))];
  const shown = deptFilter === 'All'
    ? cycle.participants
    : cycle.participants.filter((p) => p.department === deptFilter);

  return (
    <div className="p-8 max-w-5xl">

      {/* ── Breadcrumb / back ─────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/performance')}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Performance
        <ChevronRight size={12} />
        Review Cycles
      </button>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{cycle.name}</h1>
            <CycleTypeBadge type={cycle.type} />
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <Calendar size={13} />
              {new Date(cycle.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' – '}
              {new Date(cycle.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <Clock size={13} />
              Due {new Date(cycle.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
        <Badge variant={cycle.status === 'completed' ? 'success' : cycle.status === 'active' ? 'info' : 'default'}>
          {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
        </Badge>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Participants" value={String(total)} icon={<Users size={14} />} />
        <StatCard label="Completed" value={String(completed)} icon={<CheckCircle2 size={14} />} color="text-emerald-600" />
        <StatCard label="In Progress" value={String(inProg)} icon={<Clock size={14} />} color="text-blue-600" />
        <StatCard label="Avg. Score" value={`${avgScore}${typeof avgScore === 'string' && avgScore !== '—' ? '/5' : ''}`} icon={<Star size={14} />} color="text-amber-600" />
      </div>

      {/* ── Overall progress ─────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Overall Completion</h2>
          <span className="text-sm font-bold text-[var(--color-text-primary)]">{pct}%</span>
        </div>
        <div className="h-3 bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] overflow-hidden">
          <div
            className={['h-full rounded-full transition-all duration-700', pct === 100 ? 'bg-emerald-500' : 'bg-[var(--color-primary)]'].join(' ')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-6 mt-3">
          <LegendDot color="bg-emerald-500" label={`${completed} completed`} />
          <LegendDot color="bg-blue-500" label={`${inProg} in progress`} />
          <LegendDot color="bg-neutral-300" label={`${notStart} not started`} />
        </div>
      </div>

      {/* ── Participant list ──────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Participants
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({total})</span>
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={[
                  'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                  deptFilter === d
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-neutral-300',
                ].join(' ')}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              {['Participant', 'Department', 'Role', 'Review Status', 'Score'].map((col) => (
                <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {shown.map((p) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                onClick={() => router.push(`/performance/employees/${p.id}`)}
              />
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
                  No participants in this department.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ParticipantRow({ participant: p, onClick }: { participant: CycleParticipantDto; onClick: () => void }) {
  return (
    <tr
      className="hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
      onClick={onClick}
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar name={p.name} size="sm" />
          <p className="font-medium text-[var(--color-text-primary)]">{p.name}</p>
        </div>
      </td>
      <td className="px-5 py-4 text-[var(--color-text-muted)]">{p.department}</td>
      <td className="px-5 py-4 text-[var(--color-text-muted)]">{p.role}</td>
      <td className="px-5 py-4">
        <ReviewStatusBadge status={p.reviewStatus} />
      </td>
      <td className="px-5 py-4">
        {p.score !== null ? (
          <div className="flex items-center gap-1.5">
            <ScoreStars score={p.score} />
            <span className={['text-sm font-bold', p.score >= 4 ? 'text-emerald-600' : p.score >= 3 ? 'text-[var(--color-text-primary)]' : 'text-amber-600'].join(' ')}>
              {p.score.toFixed(1)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">—</span>
        )}
      </td>
    </tr>
  );
}

function StatCard({ label, value, icon, color = 'text-[var(--color-text-primary)]' }: {
  label: string; value: string; icon: React.ReactNode; color?: string;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <span className="text-[var(--color-text-muted)]">{icon}</span>
      </div>
      <p className={['text-2xl font-bold leading-tight mt-1', color].join(' ')}>{value}</p>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={['w-2.5 h-2.5 rounded-full', color].join(' ')} />
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}

function CycleTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    Annual: 'bg-violet-50 text-violet-700', 'Mid-Year': 'bg-blue-50 text-blue-700',
    Calibration: 'bg-amber-50 text-amber-700', 'Check-in': 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={['inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', colorMap[type] ?? 'bg-neutral-100 text-neutral-600'].join(' ')}>
      {type}
    </span>
  );
}

function ReviewStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'info' | 'default' }> = {
    completed:    { label: 'Completed',   variant: 'success' },
    'in-progress':{ label: 'In Progress', variant: 'info'    },
    'not-started':{ label: 'Not Started', variant: 'default' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'default' as const };
  return <Badge variant={variant}>{label}</Badge>;
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={10} className={score >= n ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'} />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="h-4 w-40 bg-[var(--color-border)] rounded-lg animate-pulse mb-6" />
      <div className="h-8 w-72 bg-[var(--color-border)] rounded-xl animate-pulse mb-4" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[var(--color-border)] rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-[var(--color-border)] rounded-2xl animate-pulse" />
    </div>
  );
}
