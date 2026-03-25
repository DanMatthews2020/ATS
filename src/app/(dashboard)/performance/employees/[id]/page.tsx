'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronRight, Star, Target, CheckCircle2, TrendingUp, Flag, Mail,
} from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip,
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { performanceApi, type TeamEmployeeDto, type GoalStatus } from '@/lib/api';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeeReviewPage({ params }: { params: { id: string } }) {
  const { id }   = params;
  const router   = useRouter();
  const { showToast } = useToast();

  const [emp,     setEmp]     = useState<TeamEmployeeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'goals' | 'history'>('overview');

  useEffect(() => {
    performanceApi.getEmployee(id)
      .then(({ employee }) => setEmp(employee))
      .catch(() => showToast('Failed to load employee', 'error'))
      .finally(() => setLoading(false));
  }, [id, showToast]);

  if (loading) return <LoadingSkeleton />;
  if (!emp) return (
    <div className="p-8">
      <p className="text-[var(--color-text-muted)]">Employee not found.</p>
    </div>
  );

  const goalsOnTrack = emp.goals.filter((g) => g.status === 'on-track').length;
  const avgComp = emp.competencies.length
    ? Math.round(emp.competencies.reduce((s, c) => s + c.score, 0) / emp.competencies.length)
    : 0;

  return (
    <div className="p-8 max-w-5xl">

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/performance')}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Performance
        <ChevronRight size={12} />
        Team
      </button>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-card mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={emp.name} size="lg" />
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{emp.name}</h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{emp.role} · {emp.department}</p>
              {emp.email && (
                <a
                  href={`mailto:${emp.email}`}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mt-1.5 transition-colors w-fit"
                >
                  <Mail size={12} />
                  {emp.email}
                </a>
              )}
            </div>
          </div>
          <ReviewStatusBadge status={emp.reviewStatus} />
        </div>

        {/* Score bar */}
        {emp.lastScore > 0 && (
          <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-[var(--color-text-muted)]">Last review score</span>
              <div className="flex items-center gap-1.5">
                <ScoreStars score={emp.lastScore} />
                <span className={['text-sm font-bold', emp.lastScore >= 4 ? 'text-emerald-600' : emp.lastScore >= 3 ? 'text-[var(--color-text-primary)]' : 'text-amber-600'].join(' ')}>
                  {emp.lastScore.toFixed(1)}/5
                </span>
              </div>
            </div>
            <div className="h-2 bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] overflow-hidden">
              <div
                className={['h-full rounded-full', emp.lastScore >= 4 ? 'bg-emerald-500' : emp.lastScore >= 3 ? 'bg-[var(--color-primary)]' : 'bg-amber-400'].join(' ')}
                style={{ width: `${(emp.lastScore / 5) * 100}%` }}
              />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Last reviewed: {emp.lastReviewDate}
            </p>
          </div>
        )}
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MiniStatCard label="Last Score" value={emp.lastScore > 0 ? `${emp.lastScore.toFixed(1)}/5` : '—'} icon={<Star size={14} />} color={emp.lastScore >= 4 ? 'text-emerald-600' : 'text-[var(--color-text-primary)]'} />
        <MiniStatCard label="Goals Completion" value={`${emp.goalsCompletion}%`} icon={<Target size={14} />} color={emp.goalsCompletion >= 75 ? 'text-emerald-600' : 'text-amber-600'} />
        <MiniStatCard label="Goals On Track" value={`${goalsOnTrack}/${emp.goals.length}`} icon={<CheckCircle2 size={14} />} color="text-[var(--color-text-primary)]" />
        <MiniStatCard label="Avg. Competency" value={`${avgComp}/100`} icon={<TrendingUp size={14} />} color="text-[var(--color-text-primary)]" />
      </div>

      {/* ── Section tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {(['overview', 'goals', 'history'] as const).map((sec) => (
          <button
            key={sec}
            onClick={() => setActiveSection(sec)}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize',
              activeSection === sec
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {sec === 'history' ? 'Review History' : sec.charAt(0).toUpperCase() + sec.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview: competency radar ────────────────────────────────────── */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          {/* Radar chart */}
          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Competency Profile</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">Scores across core competency areas</p>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={emp.competencies} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#E5E5E3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} />
                <Radar dataKey="score" stroke="#0A0A0A" fill="#0A0A0A" fillOpacity={0.12} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5E3', borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => [`${v}/100`]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Competency bars */}
          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 shadow-card">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Competency Scores</h2>
            <div className="space-y-4">
              {emp.competencies.map((c) => (
                <div key={c.subject}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-[var(--color-text-primary)]">{c.subject}</span>
                    <span className={['text-sm font-bold', c.score >= 80 ? 'text-emerald-600' : c.score >= 60 ? 'text-[var(--color-text-primary)]' : 'text-amber-600'].join(' ')}>
                      {c.score}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div
                      className={['h-full rounded-full transition-all', c.score >= 80 ? 'bg-emerald-500' : c.score >= 60 ? 'bg-[var(--color-primary)]' : 'bg-amber-400'].join(' ')}
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Goals section ────────────────────────────────────────────────── */}
      {activeSection === 'goals' && (
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
            Goals
            <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({emp.goals.length})</span>
          </h2>
          {emp.goals.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-8 text-center bg-white rounded-2xl border border-[var(--color-border)]">
              No goals assigned yet.
            </p>
          ) : (
            <div className="space-y-3">
              {emp.goals.map((g) => (
                <div key={g.id} className="bg-white border border-[var(--color-border)] rounded-xl px-5 py-4 shadow-card">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Flag size={14} className="text-[var(--color-text-muted)] mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{g.title}</p>
                    </div>
                    <Badge variant={g.status === 'on-track' ? 'success' : g.status === 'completed' ? 'success' : 'warning'}>
                      {g.status === 'on-track' ? 'On Track' : g.status === 'completed' ? 'Completed' : 'At Risk'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                      <div
                        className={['h-full rounded-full', g.status === 'on-track' || g.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-400'].join(' ')}
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-[var(--color-text-primary)] tabular-nums w-10 text-right">{g.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Review history ───────────────────────────────────────────────── */}
      {activeSection === 'history' && (
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Review History</h2>
          {emp.reviewHistory.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] py-8 text-center bg-white rounded-2xl border border-[var(--color-border)]">
              No review history yet.
            </p>
          ) : (
            <div className="space-y-3">
              {emp.reviewHistory.map((r) => (
                <div key={r.cycleId} className="bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 shadow-card flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{r.cycleName}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Completed {r.completedAt}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ScoreStars score={r.score} />
                    <span className={['text-sm font-bold', r.score >= 4 ? 'text-emerald-600' : r.score >= 3 ? 'text-[var(--color-text-primary)]' : 'text-amber-600'].join(' ')}>
                      {r.score.toFixed(1)}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniStatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
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
      <div className="h-32 bg-[var(--color-border)] rounded-2xl animate-pulse mb-6" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[var(--color-border)] rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-72 bg-[var(--color-border)] rounded-2xl animate-pulse" />
    </div>
  );
}
