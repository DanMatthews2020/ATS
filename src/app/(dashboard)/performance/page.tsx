'use client';

import { useState } from 'react';
import {
  Star,
  Plus,
  Download,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Target,
  Users,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Calendar,
  Flag,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

// ─── Mock data ────────────────────────────────────────────────────────────────

const REVIEW_CYCLES = [
  {
    id: 'rc1',
    name: 'Q1 2026 Mid-Year Review',
    type: 'Mid-Year',
    period: 'Jan – Jun 2026',
    dueDate: 'Apr 15, 2026',
    participants: 42,
    completed: 33,
    status: 'active' as const,
  },
  {
    id: 'rc2',
    name: '2025 Annual Performance Review',
    type: 'Annual',
    period: 'Jan – Dec 2025',
    dueDate: 'Jan 31, 2026',
    participants: 38,
    completed: 38,
    status: 'completed' as const,
  },
  {
    id: 'rc3',
    name: 'Engineering — Q4 Calibration',
    type: 'Calibration',
    period: 'Oct – Dec 2025',
    dueDate: 'Jan 10, 2026',
    participants: 14,
    completed: 14,
    status: 'completed' as const,
  },
  {
    id: 'rc4',
    name: 'Q2 2026 Goal Check-in',
    type: 'Check-in',
    period: 'Apr – Jun 2026',
    dueDate: 'Jul 1, 2026',
    participants: 42,
    completed: 0,
    status: 'upcoming' as const,
  },
];

const SCORE_DISTRIBUTION = [
  { label: 'Outstanding',    score: '5', count: 6,  color: '#22C55E' },
  { label: 'Exceeds',        score: '4', count: 14, color: '#0A0A0A' },
  { label: 'Meets',          score: '3', count: 12, color: '#6B7280' },
  { label: 'Below',          score: '2', count: 4,  color: '#F97316' },
  { label: 'Needs Improv.',  score: '1', count: 2,  color: '#EF4444' },
];

const GOALS = [
  {
    id: 'g1',
    title: 'Reduce time-to-hire by 20%',
    owner: 'Sarah Johnson',
    dueDate: 'Jun 30, 2026',
    progress: 72,
    status: 'on-track' as const,
    type: 'Company',
  },
  {
    id: 'g2',
    title: 'Launch new onboarding program',
    owner: 'Priya Patel',
    dueDate: 'Apr 30, 2026',
    progress: 88,
    status: 'on-track' as const,
    type: 'Department',
  },
  {
    id: 'g3',
    title: 'Complete SOC 2 Type II certification',
    owner: 'Marcus Chen',
    dueDate: 'Mar 31, 2026',
    progress: 45,
    status: 'at-risk' as const,
    type: 'Department',
  },
  {
    id: 'g4',
    title: 'Grow engineering headcount to 25',
    owner: 'Carlos Rivera',
    dueDate: 'Dec 31, 2026',
    progress: 60,
    status: 'on-track' as const,
    type: 'Company',
  },
  {
    id: 'g5',
    title: 'Implement diversity hiring targets',
    owner: 'Aisha Thompson',
    dueDate: 'May 15, 2026',
    progress: 20,
    status: 'at-risk' as const,
    type: 'Individual',
  },
];

const EMPLOYEES = [
  {
    id: 'e1',
    name: 'Sarah Johnson',
    role: 'Senior Engineer',
    department: 'Engineering',
    reviewStatus: 'completed' as const,
    lastScore: 4.2,
    goalsCompletion: 85,
    lastReviewDate: 'Mar 10, 2026',
  },
  {
    id: 'e2',
    name: 'Marcus Chen',
    role: 'Backend Developer',
    department: 'Engineering',
    reviewStatus: 'in-progress' as const,
    lastScore: 3.8,
    goalsCompletion: 60,
    lastReviewDate: 'Mar 12, 2026',
  },
  {
    id: 'e3',
    name: 'Aisha Thompson',
    role: 'UX Designer',
    department: 'Design',
    reviewStatus: 'completed' as const,
    lastScore: 4.7,
    goalsCompletion: 92,
    lastReviewDate: 'Mar 8, 2026',
  },
  {
    id: 'e4',
    name: 'Priya Patel',
    role: 'Product Manager',
    department: 'Product',
    reviewStatus: 'not-started' as const,
    lastScore: 4.1,
    goalsCompletion: 75,
    lastReviewDate: 'Sep 15, 2025',
  },
  {
    id: 'e5',
    name: 'Carlos Rivera',
    role: 'Data Analyst',
    department: 'Analytics',
    reviewStatus: 'in-progress' as const,
    lastScore: 3.5,
    goalsCompletion: 50,
    lastReviewDate: 'Mar 11, 2026',
  },
  {
    id: 'e6',
    name: 'James Wilson',
    role: 'Frontend Developer',
    department: 'Engineering',
    reviewStatus: 'completed' as const,
    lastScore: 3.2,
    goalsCompletion: 68,
    lastReviewDate: 'Mar 9, 2026',
  },
];

const COMPETENCY_DATA = [
  { subject: 'Execution', value: 82 },
  { subject: 'Collaboration', value: 74 },
  { subject: 'Communication', value: 68 },
  { subject: 'Leadership', value: 55 },
  { subject: 'Innovation', value: 71 },
  { subject: 'Technical', value: 88 },
];

const TABS = ['Overview', 'Review Cycles', 'Goals', 'Team'];

const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #E5E5E3',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState('Overview');

  const completionRate = Math.round(
    (REVIEW_CYCLES.filter((c) => c.status === 'completed').length / REVIEW_CYCLES.length) * 100,
  );
  const activeCycles = REVIEW_CYCLES.filter((c) => c.status === 'active').length;
  const goalsOnTrack = GOALS.filter((g) => g.status === 'on-track').length;
  const avgScore = (
    EMPLOYEES.reduce((sum, e) => sum + e.lastScore, 0) / EMPLOYEES.length
  ).toFixed(1);

  return (
    <div className="p-8 flex-1">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
            <Star size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
              Performance
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Review cycles, goals, and team performance ratings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md">
            <Download size={14} />
            Export
          </Button>
          <Button variant="secondary" size="md">
            <Target size={14} />
            New Goal
          </Button>
          <Button variant="primary" size="md">
            <Plus size={14} />
            Start Review Cycle
          </Button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2.5 text-sm font-medium transition-colors duration-100 border-b-2 -mb-px outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 rounded-t',
              activeTab === tab
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <PerfStatCard
          label="Review Completion"
          value={`${completionRate}%`}
          change="+8% vs last cycle"
          positive={true}
          icon={<CheckCircle2 size={14} />}
        />
        <PerfStatCard
          label="Active Cycles"
          value={String(activeCycles)}
          change="1 ending soon"
          positive={true}
          icon={<Clock size={14} />}
        />
        <PerfStatCard
          label="Goals On Track"
          value={`${goalsOnTrack}/${GOALS.length}`}
          change="2 at risk"
          positive={false}
          icon={<Target size={14} />}
        />
        <PerfStatCard
          label="Avg. Score"
          value={`${avgScore}/5`}
          change="+0.3 vs last cycle"
          positive={true}
          icon={<Star size={14} />}
        />
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 mb-6">

        {/* Score distribution bar chart */}
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Score Distribution
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Employee ratings from last completed review cycle
              </p>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] mt-0.5">2025 Annual</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={SCORE_DISTRIBUTION}
              margin={{ top: 4, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(v) => [`${v} employees`]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#0A0A0A">
                {SCORE_DISTRIBUTION.map((entry, i) => (
                  <rect key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Competency radar */}
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Team Competencies
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Average scores across core competency areas
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={COMPETENCY_DATA} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
              <PolarGrid stroke="#E5E5E3" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#6B7280', fontSize: 10 }}
              />
              <Radar
                dataKey="value"
                stroke="#0A0A0A"
                fill="#0A0A0A"
                fillOpacity={0.12}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(v) => [`${v}/100`]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Review cycles + Goals ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">

        {/* Review Cycles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Review Cycles
            </h2>
            <button className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {REVIEW_CYCLES.map((cycle) => {
              const pct = Math.round((cycle.completed / cycle.participants) * 100);
              return (
                <div
                  key={cycle.id}
                  className="bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {cycle.name}
                        </p>
                        <CycleTypeBadge type={cycle.type} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                          <Calendar size={10} />
                          {cycle.period}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                          <Clock size={10} />
                          Due {cycle.dueDate}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                          <Users size={10} />
                          {cycle.participants} participants
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        cycle.status === 'completed'
                          ? 'success'
                          : cycle.status === 'active'
                            ? 'info'
                            : 'default'
                      }
                    >
                      {cycle.status === 'active'
                        ? 'Active'
                        : cycle.status === 'completed'
                          ? 'Completed'
                          : 'Upcoming'}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                      <div
                        className={[
                          'h-full rounded-full transition-all duration-500',
                          pct === 100 ? 'bg-emerald-500' : 'bg-[var(--color-primary)]',
                        ].join(' ')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums w-12 text-right">
                      {cycle.completed}/{cycle.participants}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Goals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Goals</h2>
            <button className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {GOALS.map((goal) => (
              <div
                key={goal.id}
                className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-3.5 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
                      {goal.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-[var(--color-text-muted)]">{goal.owner}</span>
                      <span className="text-[var(--color-border)]">·</span>
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Flag size={9} />
                        {goal.dueDate}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <GoalTypePill type={goal.type} />
                    <Badge variant={goal.status === 'on-track' ? 'success' : 'warning'}>
                      {goal.status === 'on-track' ? 'On Track' : 'At Risk'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div
                      className={[
                        'h-full rounded-full',
                        goal.status === 'on-track' ? 'bg-emerald-500' : 'bg-amber-400',
                      ].join(' ')}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums w-8 text-right">
                    {goal.progress}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Team performance table ───────────────────────────────────────── */}
      <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Team Performance
            </h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              Individual review status and scores for the current cycle
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="secondary" size="sm">
              <Download size={13} />
              Export
            </Button>
            <Button variant="primary" size="sm">
              <Plus size={13} />
              Add Employee
            </Button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
              {['Employee', 'Department', 'Review Status', 'Last Score', 'Goals', 'Last Review', 'Actions'].map(
                (col) => (
                  <th
                    key={col}
                    className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide whitespace-nowrap"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {EMPLOYEES.map((emp) => (
              <tr
                key={emp.id}
                className="hover:bg-[var(--color-surface)] transition-colors"
              >
                {/* Employee */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={emp.name} size="sm" />
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">{emp.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{emp.role}</p>
                    </div>
                  </div>
                </td>

                {/* Department */}
                <td className="px-5 py-4 text-[var(--color-text-muted)]">{emp.department}</td>

                {/* Review status */}
                <td className="px-5 py-4">
                  <ReviewStatusBadge status={emp.reviewStatus} />
                </td>

                {/* Last score */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <ScoreStars score={emp.lastScore} />
                    <span
                      className={[
                        'text-sm font-bold tabular-nums',
                        emp.lastScore >= 4
                          ? 'text-emerald-600'
                          : emp.lastScore >= 3
                            ? 'text-[var(--color-text-primary)]'
                            : 'text-amber-600',
                      ].join(' ')}
                    >
                      {emp.lastScore.toFixed(1)}
                    </span>
                  </div>
                </td>

                {/* Goals completion */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <div className="flex-1 h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                      <div
                        className={[
                          'h-full rounded-full',
                          emp.goalsCompletion >= 75 ? 'bg-emerald-500' : 'bg-amber-400',
                        ].join(' ')}
                        style={{ width: `${emp.goalsCompletion}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)] tabular-nums w-8">
                      {emp.goalsCompletion}%
                    </span>
                  </div>
                </td>

                {/* Last review date */}
                <td className="px-5 py-4 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                  {emp.lastReviewDate}
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm">
                      <Eye size={12} />
                      View
                    </Button>
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] transition-colors"
                      aria-label="More options"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PerfStatCard({
  label,
  value,
  change,
  positive,
  icon,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <span className="text-[var(--color-text-muted)]">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight mt-1">
        {value}
      </p>
      <div className="flex items-center gap-1 mt-1">
        {positive ? (
          <TrendingUp size={12} className="text-emerald-500 flex-shrink-0" />
        ) : (
          <TrendingDown size={12} className="text-red-500 flex-shrink-0" />
        )}
        <span
          className={['text-xs font-medium', positive ? 'text-emerald-600' : 'text-red-500'].join(
            ' ',
          )}
        >
          {change}
        </span>
      </div>
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: 'completed' | 'in-progress' | 'not-started' }) {
  const map = {
    completed: { label: 'Completed', variant: 'success' as const },
    'in-progress': { label: 'In Progress', variant: 'info' as const },
    'not-started': { label: 'Not Started', variant: 'default' as const },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function CycleTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    Annual: 'bg-violet-50 text-violet-700',
    'Mid-Year': 'bg-blue-50 text-blue-700',
    Calibration: 'bg-amber-50 text-amber-700',
    'Check-in': 'bg-emerald-50 text-emerald-700',
  };
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
        colorMap[type] ?? 'bg-neutral-100 text-neutral-600',
      ].join(' ')}
    >
      {type}
    </span>
  );
}

function GoalTypePill({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    Company: 'bg-neutral-100 text-neutral-600',
    Department: 'bg-indigo-50 text-indigo-600',
    Individual: 'bg-orange-50 text-orange-600',
  };
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap',
        colorMap[type] ?? 'bg-neutral-100 text-neutral-600',
      ].join(' ')}
    >
      {type}
    </span>
  );
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={10}
          className={score >= n ? 'text-amber-400 fill-amber-400' : 'text-neutral-200 fill-neutral-200'}
        />
      ))}
    </div>
  );
}
