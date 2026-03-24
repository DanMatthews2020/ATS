'use client';

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star, Plus, Download, TrendingUp, TrendingDown, CheckCircle2, Clock, Target,
  Users, ChevronRight, Eye, MoreHorizontal, Calendar, Flag, X, Search, Check,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import {
  performanceApi,
  type PerformanceStatsDto,
  type ReviewCycleDto,
  type PerformanceGoalDto,
  type TeamEmployeeDto,
  type ReviewCycleType,
  type GoalType,
  type GoalStatus,
} from '@/lib/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Review Cycles', 'Goals', 'Team'] as const;
type Tab = typeof TABS[number];

const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#fff',
  border: '1px solid #E5E5E3',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
};

const BAR_COLORS: Record<string, string> = {
  Outstanding: '#22C55E',
  Exceeds:     '#0A0A0A',
  Meets:       '#6B7280',
  Below:       '#F97316',
  'Needs Improv.': '#EF4444',
};

const CYCLE_TYPES: ReviewCycleType[] = ['Annual', 'Mid-Year', 'Calibration', 'Check-in'];
const GOAL_TYPES: GoalType[]         = ['Company', 'Department', 'Individual'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const router   = useRouter();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  // Data
  const [stats,    setStats]    = useState<PerformanceStatsDto | null>(null);
  const [cycles,   setCycles]   = useState<ReviewCycleDto[]>([]);
  const [goals,    setGoals]    = useState<PerformanceGoalDto[]>([]);
  const [employees, setEmployees] = useState<TeamEmployeeDto[]>([]);
  const [scoreData,  setScoreData]  = useState<{ label: string; score: string; count: number }[]>([]);
  const [radarData,  setRadarData]  = useState<{ subject: string; value: number }[]>([]);
  const [userList,   setUserList]   = useState<{ id: string; name: string; role: string; department: string }[]>([]);

  // Modal state
  const [goalModalOpen,  setGoalModalOpen]  = useState(false);
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [editGoal,       setEditGoal]       = useState<PerformanceGoalDto | null>(null);
  const [addEmpOpen,     setAddEmpOpen]     = useState(false);

  // Load all data
  useEffect(() => {
    Promise.all([
      performanceApi.getStats(),
      performanceApi.getCycles(),
      performanceApi.getGoals(),
      performanceApi.getEmployees(),
      performanceApi.getScoreDistribution(),
      performanceApi.getCompetencyData(),
      performanceApi.getUsers(),
    ]).then(([st, cy, gl, em, sc, rd, ul]) => {
      setStats(st);
      setCycles(cy.cycles);
      setGoals(gl.goals);
      setEmployees(em.employees);
      setScoreData(sc.distribution);
      setRadarData(rd.competencies);
      setUserList(ul.users);
    }).catch(() => showToast('Failed to load performance data', 'error'));
  }, [showToast]);

  function refreshAll() {
    Promise.all([
      performanceApi.getStats(),
      performanceApi.getCycles(),
      performanceApi.getGoals(),
      performanceApi.getEmployees(),
    ]).then(([st, cy, gl, em]) => {
      setStats(st);
      setCycles(cy.cycles);
      setGoals(gl.goals);
      setEmployees(em.employees);
    }).catch(() => {});
  }

  function handleExportCSV() {
    const rows = [
      ['Name', 'Department', 'Role', 'Review Status', 'Last Score', 'Goals %', 'Last Review'],
      ...employees.map((e) => [
        e.name, e.department, e.role, e.reviewStatus,
        e.lastScore.toFixed(1), `${e.goalsCompletion}%`, e.lastReviewDate,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'team-performance.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Derived
  const activeCycle = cycles.find((c) => c.status === 'active');

  return (
    <div className="p-8 flex-1">

      {/* ── Page header ──────────────────────────────────────────────────── */}
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
          <Button variant="secondary" size="md" onClick={handleExportCSV}>
            <Download size={14} />
            Export
          </Button>
          <Button variant="secondary" size="md" onClick={() => { setEditGoal(null); setGoalModalOpen(true); }}>
            <Target size={14} />
            New Goal
          </Button>
          <Button variant="primary" size="md" onClick={() => setCycleModalOpen(true)}>
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
              'px-4 py-2.5 text-sm font-medium transition-colors duration-100 border-b-2 -mb-px outline-none rounded-t',
              activeTab === tab
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Stat cards (always visible) ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <PerfStatCard
          label="Review Completion"
          value={stats ? `${stats.completionRate}%` : '—'}
          change={stats?.completionRateDelta ?? ''}
          positive={true}
          icon={<CheckCircle2 size={14} />}
        />
        <PerfStatCard
          label="Active Cycles"
          value={stats ? String(stats.activeCycles) : '—'}
          change={stats?.activeCyclesNote ?? ''}
          positive={true}
          icon={<Clock size={14} />}
        />
        <PerfStatCard
          label="Goals On Track"
          value={stats ? `${stats.goalsOnTrack}/${stats.totalGoals}` : '—'}
          change={stats ? `${stats.goalsAtRisk} at risk` : ''}
          positive={(stats?.goalsAtRisk ?? 0) === 0}
          icon={<Target size={14} />}
        />
        <PerfStatCard
          label="Avg. Score"
          value={stats ? `${stats.avgScore}/5` : '—'}
          change={stats?.avgScoreDelta ?? ''}
          positive={true}
          icon={<Star size={14} />}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB: Overview
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'Overview' && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 mb-6">
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Score Distribution</h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Employee ratings from last completed review cycle</p>
                </div>
                <span className="text-xs text-[var(--color-text-muted)] mt-0.5">2025 Annual</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${v} employees`]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreData.map((entry) => (
                      <Cell key={entry.label} fill={BAR_COLORS[entry.label] ?? '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-5 shadow-card">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Team Competencies</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Average scores across core competency areas</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                  <PolarGrid stroke="#E5E5E3" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#0A0A0A" fill="#0A0A0A" fillOpacity={0.12} strokeWidth={2} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${v}/100`]} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cycles + Goals preview */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Review Cycles</h2>
                <button
                  onClick={() => setActiveTab('Review Cycles')}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-0.5"
                >
                  View all <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-3">
                {cycles.slice(0, 3).map((cycle) => (
                  <CycleCard
                    key={cycle.id}
                    cycle={cycle}
                    onClick={() => router.push(`/performance/cycles/${cycle.id}`)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Goals</h2>
                <button
                  onClick={() => setActiveTab('Goals')}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-0.5"
                >
                  View all <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-2.5">
                {goals.slice(0, 4).map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onClick={() => { setEditGoal(goal); setGoalModalOpen(true); }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Team preview */}
          <TeamTable
            employees={employees.slice(0, 4)}
            onView={(id) => router.push(`/performance/employees/${id}`)}
            onAddEmployee={() => setAddEmpOpen(true)}
            onExport={handleExportCSV}
          />
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: Review Cycles
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'Review Cycles' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              All Review Cycles
              <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                ({cycles.length})
              </span>
            </h2>
            <Button variant="primary" size="sm" onClick={() => setCycleModalOpen(true)}>
              <Plus size={13} />
              Start Review Cycle
            </Button>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'active', 'completed', 'upcoming'] as const).map((f) => {
              const count = f === 'all' ? cycles.length : cycles.filter((c) => c.status === f).length;
              return (
                <FilterPill key={f} label={`${f.charAt(0).toUpperCase() + f.slice(1)} (${count})`} />
              );
            })}
          </div>

          <div className="space-y-3">
            {cycles.map((cycle) => (
              <CycleCard
                key={cycle.id}
                cycle={cycle}
                expanded
                onClick={() => router.push(`/performance/cycles/${cycle.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: Goals
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'Goals' && (
        <GoalsTab
          goals={goals}
          onNew={() => { setEditGoal(null); setGoalModalOpen(true); }}
          onEdit={(g) => { setEditGoal(g); setGoalModalOpen(true); }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB: Team
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'Team' && (
        <TeamTable
          employees={employees}
          onView={(id) => router.push(`/performance/employees/${id}`)}
          onAddEmployee={() => setAddEmpOpen(true)}
          onExport={handleExportCSV}
        />
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {goalModalOpen && (
        <GoalModal
          initial={editGoal}
          userList={userList}
          onClose={() => { setGoalModalOpen(false); setEditGoal(null); }}
          onSave={async (data) => {
            if (editGoal) {
              await performanceApi.updateGoal(editGoal.id, data);
              showToast('Goal updated', 'success');
            } else {
              const { goal } = await performanceApi.createGoal(data as Parameters<typeof performanceApi.createGoal>[0]);
              setGoals((prev) => [goal, ...prev]);
              showToast('Goal created', 'success');
            }
            refreshAll();
            setGoalModalOpen(false);
            setEditGoal(null);
          }}
        />
      )}

      {cycleModalOpen && (
        <CycleModal
          userList={userList}
          onClose={() => setCycleModalOpen(false)}
          onSave={async (data) => {
            const { cycle } = await performanceApi.createCycle(data);
            setCycles((prev) => [cycle, ...prev]);
            showToast('Review cycle started', 'success');
            refreshAll();
            setCycleModalOpen(false);
          }}
        />
      )}

      {addEmpOpen && (
        <AddEmployeeModal
          activeCycle={activeCycle ?? null}
          onClose={() => setAddEmpOpen(false)}
          onSave={async (data) => {
            const { employee } = await performanceApi.addEmployee(data);
            setEmployees((prev) => [...prev, employee]);
            showToast('Employee added to active cycle', 'success');
            setAddEmpOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

function GoalsTab({
  goals, onNew, onEdit,
}: { goals: PerformanceGoalDto[]; onNew: () => void; onEdit: (g: PerformanceGoalDto) => void }) {
  const [filter, setFilter] = useState<'All' | GoalType>('All');

  const shown = filter === 'All' ? goals : goals.filter((g) => g.type === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          Goals
          <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">({goals.length})</span>
        </h2>
        <Button variant="primary" size="sm" onClick={onNew}>
          <Plus size={13} />
          New Goal
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['All', 'Company', 'Department', 'Individual'] as const).map((f) => {
          const count = f === 'All' ? goals.length : goals.filter((g) => g.type === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                filter === f
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-neutral-300',
              ].join(' ')}
            >
              {f} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {shown.map((goal) => (
          <GoalCard key={goal.id} goal={goal} expanded onClick={() => onEdit(goal)} />
        ))}
        {shown.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
            No goals found.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Team Table ───────────────────────────────────────────────────────────────

function TeamTable({
  employees, onView, onAddEmployee, onExport,
}: {
  employees: TeamEmployeeDto[];
  onView: (id: string) => void;
  onAddEmployee: () => void;
  onExport: () => void;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Team Performance</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Individual review status and scores for the current cycle
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={onExport}>
            <Download size={13} />
            Export
          </Button>
          <Button variant="primary" size="sm" onClick={onAddEmployee}>
            <Plus size={13} />
            Add Employee
          </Button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            {['Employee', 'Department', 'Review Status', 'Last Score', 'Goals', 'Last Review', 'Actions'].map((col) => (
              <th key={col} className="px-5 py-3 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {employees.map((emp) => (
            <tr key={emp.id} className="hover:bg-[var(--color-surface)] transition-colors">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <Avatar name={emp.name} size="sm" />
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">{emp.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{emp.role}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4 text-[var(--color-text-muted)]">{emp.department}</td>
              <td className="px-5 py-4"><ReviewStatusBadge status={emp.reviewStatus} /></td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-1.5">
                  <ScoreStars score={emp.lastScore} />
                  <span className={[
                    'text-sm font-bold tabular-nums',
                    emp.lastScore >= 4 ? 'text-emerald-600' : emp.lastScore >= 3 ? 'text-[var(--color-text-primary)]' : 'text-amber-600',
                  ].join(' ')}>
                    {emp.lastScore > 0 ? emp.lastScore.toFixed(1) : '—'}
                  </span>
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2 min-w-[80px]">
                  <div className="flex-1 h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                    <div
                      className={['h-full rounded-full', emp.goalsCompletion >= 75 ? 'bg-emerald-500' : 'bg-amber-400'].join(' ')}
                      style={{ width: `${emp.goalsCompletion}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--color-text-muted)] tabular-nums w-8">{emp.goalsCompletion}%</span>
                </div>
              </td>
              <td className="px-5 py-4 text-xs text-[var(--color-text-muted)] whitespace-nowrap">{emp.lastReviewDate}</td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onView(emp.id)}>
                    <Eye size={12} />
                    View
                  </Button>
                  <button className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors" aria-label="More">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {employees.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
                No employees found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Goal Modal ───────────────────────────────────────────────────────────────

function GoalModal({
  initial, userList, onClose, onSave,
}: {
  initial:  PerformanceGoalDto | null;
  userList: { id: string; name: string; role: string; department: string }[];
  onClose:  () => void;
  onSave:   (data: {
    title: string; owner: string; ownerId: string | null;
    type: GoalType; dueDate: string; targetPct: number; description: string;
  }) => Promise<void>;
}) {
  const [title,       setTitle]       = useState(initial?.title ?? '');
  const [ownerQuery,  setOwnerQuery]  = useState(initial?.owner ?? '');
  const [ownerId,     setOwnerId]     = useState<string | null>(initial?.ownerId ?? null);
  const [type,        setType]        = useState<GoalType>(initial?.type ?? 'Company');
  const [dueDate,     setDueDate]     = useState(initial?.dueDate?.slice(0, 10) ?? '');
  const [targetPct,   setTargetPct]   = useState(String(initial?.targetPct ?? 100));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving,      setSaving]      = useState(false);
  const [ownerOpen,   setOwnerOpen]   = useState(false);

  const filtered = userList.filter((u) =>
    u.name.toLowerCase().includes(ownerQuery.toLowerCase()),
  );

  async function handleSubmit() {
    if (!title.trim() || !ownerQuery.trim() || !dueDate) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(), owner: ownerQuery.trim(), ownerId,
        type, dueDate, targetPct: Number(targetPct) || 100,
        description: description.trim(),
      });
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? 'Edit Goal' : 'New Goal'} onClose={onClose}>
      <div className="space-y-4">
        <Input label="Title" placeholder="e.g. Reduce time-to-hire by 20%" value={title} onChange={(e) => setTitle(e.target.value)} />

        {/* Owner */}
        <div className="relative">
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Owner</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)]"
              placeholder="Search users…"
              value={ownerQuery}
              onChange={(e) => { setOwnerQuery(e.target.value); setOwnerOpen(true); setOwnerId(null); }}
              onFocus={() => setOwnerOpen(true)}
            />
          </div>
          {ownerOpen && filtered.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden">
              {filtered.slice(0, 6).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-surface)] text-left"
                  onClick={() => { setOwnerQuery(u.name); setOwnerId(u.id); setOwnerOpen(false); }}
                >
                  <Avatar name={u.name} size="sm" />
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">{u.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{u.role} · {u.department}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Type</label>
          <div className="flex gap-2">
            {GOAL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={[
                  'px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
                  type === t
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-neutral-300',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <Input label="Target %" type="number" min={0} max={100} placeholder="100" value={targetPct} onChange={(e) => setTargetPct(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-primary)]">Description</label>
          <textarea
            className="w-full h-24 px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)]"
            placeholder="Describe the goal and success criteria…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2.5 mt-6">
        <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary" size="md"
          onClick={handleSubmit}
          disabled={!title.trim() || !ownerQuery.trim() || !dueDate || saving}
        >
          {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Goal'}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Cycle Modal ──────────────────────────────────────────────────────────────

function CycleModal({
  userList, onClose, onSave,
}: {
  userList: { id: string; name: string; role: string; department: string }[];
  onClose:  () => void;
  onSave:   (data: {
    name: string; type: ReviewCycleType;
    startDate: string; endDate: string; dueDate: string;
    participantIds: string[];
  }) => Promise<void>;
}) {
  const [name,           setName]           = useState('');
  const [type,           setType]           = useState<ReviewCycleType>('Annual');
  const [startDate,      setStartDate]      = useState('');
  const [endDate,        setEndDate]        = useState('');
  const [dueDate,        setDueDate]        = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [search,         setSearch]         = useState('');
  const [saving,         setSaving]         = useState(false);

  const filtered = userList.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
    if (!name.trim() || !startDate || !endDate || !dueDate) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type, startDate, endDate, dueDate, participantIds });
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal title="Start Review Cycle" onClose={onClose} wide>
      <div className="space-y-4">
        <Input label="Cycle name" placeholder="e.g. Q1 2026 Mid-Year Review" value={name} onChange={(e) => setName(e.target.value)} />

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Type</label>
          <div className="flex gap-2 flex-wrap">
            {CYCLE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={[
                  'px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
                  type === t
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-neutral-300',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-3 gap-4">
          <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End date"   type="date" value={endDate}   onChange={(e) => setEndDate(e.target.value)} />
          <Input label="Due date"   type="date" value={dueDate}   onChange={(e) => setDueDate(e.target.value)} />
        </div>

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">Participants</label>
            <span className="text-xs text-[var(--color-text-muted)]">{participantIds.length} selected</span>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)]"
              placeholder="Search employees…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
            {filtered.map((u) => {
              const selected = participantIds.includes(u.id);
              return (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[var(--color-surface)]">
                  <div className={[
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                    selected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]',
                  ].join(' ')}>
                    {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                  <input type="checkbox" className="hidden" checked={selected} onChange={() => toggleParticipant(u.id)} />
                  <Avatar name={u.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--color-text-primary)] truncate">{u.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{u.department}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2.5 mt-6">
        <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary" size="md"
          onClick={handleSubmit}
          disabled={!name.trim() || !startDate || !endDate || !dueDate || saving}
        >
          {saving ? 'Starting…' : 'Start Review Cycle'}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────

function AddEmployeeModal({
  activeCycle, onClose, onSave,
}: {
  activeCycle: ReviewCycleDto | null;
  onClose: () => void;
  onSave: (data: { name: string; role: string; department: string; email: string }) => Promise<void>;
}) {
  const [name,       setName]       = useState('');
  const [role,       setRole]       = useState('');
  const [department, setDepartment] = useState('');
  const [email,      setEmail]      = useState('');
  const [saving,     setSaving]     = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !department.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), role: role.trim(), department: department.trim(), email: email.trim() });
    } catch {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Employee" onClose={onClose}>
      {activeCycle && (
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Adding to active cycle: <span className="font-medium text-[var(--color-text-primary)]">{activeCycle.name}</span>
        </p>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full name *" placeholder="Sarah Johnson" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Role" placeholder="Senior Engineer" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Department *" placeholder="Engineering" value={department} onChange={(e) => setDepartment(e.target.value)} />
          <Input label="Work email" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2.5 mt-6">
        <Button variant="secondary" size="md" onClick={onClose}>Cancel</Button>
        <Button
          variant="primary" size="md"
          onClick={handleSubmit}
          disabled={!name.trim() || !department.trim() || saving}
        >
          {saving ? 'Adding…' : 'Add Employee'}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Shared cards ─────────────────────────────────────────────────────────────

function CycleCard({
  cycle, expanded = false, onClick,
}: { cycle: ReviewCycleDto; expanded?: boolean; onClick: () => void }) {
  const total     = cycle.participants.length;
  const completed = cycle.participants.filter((p) => p.reviewStatus === 'completed').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-[var(--color-border)] rounded-2xl px-5 py-4 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{cycle.name}</p>
            <CycleTypeBadge type={cycle.type} />
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Calendar size={10} />
              {new Date(cycle.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} –{' '}
              {new Date(cycle.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Clock size={10} />
              Due {new Date(cycle.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Users size={10} />
              {total} participant{total !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <Badge variant={cycle.status === 'completed' ? 'success' : cycle.status === 'active' ? 'info' : 'default'}>
          {cycle.status.charAt(0).toUpperCase() + cycle.status.slice(1)}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
          <div
            className={['h-full rounded-full transition-all duration-500', pct === 100 ? 'bg-emerald-500' : 'bg-[var(--color-primary)]'].join(' ')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums w-16 text-right">
          {completed}/{total}
        </span>
      </div>

      {expanded && total > 0 && (
        <div className="mt-3 flex -space-x-1.5">
          {cycle.participants.slice(0, 6).map((p) => (
            <Avatar key={p.id} name={p.name} size="sm" />
          ))}
          {total > 6 && (
            <span className="w-7 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[10px] text-[var(--color-text-muted)] font-medium">
              +{total - 6}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal, expanded = false, onClick,
}: { goal: PerformanceGoalDto; expanded?: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-[var(--color-border)] rounded-xl px-4 py-3.5 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-150 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">{goal.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-[var(--color-text-muted)]">{goal.owner}</span>
            <span className="text-[var(--color-border)]">·</span>
            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
              <Flag size={9} />
              {new Date(goal.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          {expanded && goal.description && (
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5 line-clamp-2">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <GoalTypePill type={goal.type} />
          <Badge variant={goal.status === 'on-track' ? 'success' : goal.status === 'completed' ? 'success' : 'warning'}>
            {goal.status === 'on-track' ? 'On Track' : goal.status === 'completed' ? 'Completed' : 'At Risk'}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
          <div
            className={['h-full rounded-full', goal.status === 'on-track' || goal.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-400'].join(' ')}
            style={{ width: `${goal.progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-[var(--color-text-primary)] tabular-nums w-8 text-right">
          {goal.progress}%
        </span>
      </div>
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, wide = false, children }: {
  title: string; onClose: () => void; wide?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={['relative bg-white rounded-2xl shadow-xl border border-[var(--color-border)] mx-4 p-6 max-h-[90vh] overflow-y-auto', wide ? 'w-full max-w-xl' : 'w-full max-w-md'].join(' ')}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function FilterPill({ label }: { label: string }) {
  return (
    <span className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)]">
      {label}
    </span>
  );
}

function PerfStatCard({ label, value, change, positive, icon }: {
  label: string; value: string; change: string; positive: boolean; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <span className="text-[var(--color-text-muted)]">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight mt-1">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {positive
          ? <TrendingUp size={12} className="text-emerald-500 flex-shrink-0" />
          : <TrendingDown size={12} className="text-red-500 flex-shrink-0" />}
        <span className={['text-xs font-medium', positive ? 'text-emerald-600' : 'text-red-500'].join(' ')}>
          {change}
        </span>
      </div>
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: 'completed' | 'in-progress' | 'not-started' }) {
  const map = {
    completed:    { label: 'Completed',   variant: 'success' as const },
    'in-progress':{ label: 'In Progress', variant: 'info'    as const },
    'not-started':{ label: 'Not Started', variant: 'default' as const },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function CycleTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    Annual:       'bg-violet-50 text-violet-700',
    'Mid-Year':   'bg-blue-50 text-blue-700',
    Calibration:  'bg-amber-50 text-amber-700',
    'Check-in':   'bg-emerald-50 text-emerald-700',
  };
  return (
    <span className={['inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap', colorMap[type] ?? 'bg-neutral-100 text-neutral-600'].join(' ')}>
      {type}
    </span>
  );
}

function GoalTypePill({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    Company:    'bg-neutral-100 text-neutral-600',
    Department: 'bg-indigo-50 text-indigo-600',
    Individual: 'bg-orange-50 text-orange-600',
  };
  return (
    <span className={['inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap', colorMap[type] ?? 'bg-neutral-100 text-neutral-600'].join(' ')}>
      {type}
    </span>
  );
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
