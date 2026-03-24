/**
 * @file performance.service.ts
 * @description In-memory performance management store.
 * Seeded with realistic data; new records accumulate for the server lifetime.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewCycleType = 'Annual' | 'Mid-Year' | 'Calibration' | 'Check-in';
export type CycleStatus     = 'active' | 'completed' | 'upcoming';
export type GoalType        = 'Company' | 'Department' | 'Individual';
export type GoalStatus      = 'on-track' | 'at-risk' | 'completed';
export type ReviewStatus    = 'completed' | 'in-progress' | 'not-started';

export interface CycleParticipant {
  id:           string;
  name:         string;
  role:         string;
  department:   string;
  reviewStatus: ReviewStatus;
  score:        number | null;
}

export interface ReviewCycle {
  id:           string;
  name:         string;
  type:         ReviewCycleType;
  startDate:    string;
  endDate:      string;
  dueDate:      string;
  status:       CycleStatus;
  participants: CycleParticipant[];
  createdAt:    string;
}

export interface PerformanceGoal {
  id:          string;
  title:       string;
  owner:       string;
  ownerId:     string | null;
  type:        GoalType;
  dueDate:     string;
  progress:    number;
  targetPct:   number;
  status:      GoalStatus;
  description: string;
  createdAt:   string;
}

export interface TeamEmployee {
  id:               string;
  name:             string;
  role:             string;
  department:       string;
  email:            string;
  reviewStatus:     ReviewStatus;
  lastScore:        number;
  goalsCompletion:  number;
  lastReviewDate:   string;
  competencies:     { subject: string; score: number }[];
  goals:            { id: string; title: string; progress: number; status: GoalStatus }[];
  reviewHistory:    { cycleId: string; cycleName: string; score: number; completedAt: string }[];
}

export interface PerformanceStats {
  completionRate:      number;
  activeCycles:        number;
  goalsOnTrack:        number;
  totalGoals:          number;
  avgScore:            number;
  completionRateDelta: string;
  activeCyclesNote:    string;
  goalsAtRisk:         number;
  avgScoreDelta:       string;
}

export interface ScoreDistributionItem {
  label: string;
  score: string;
  count: number;
}

export interface CompetencyItem {
  subject: string;
  value:   number;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_EMPLOYEES: TeamEmployee[] = [
  {
    id: 'e1', name: 'Sarah Johnson', role: 'Senior Engineer', department: 'Engineering',
    email: 'sarah.johnson@teamtalent.com',
    reviewStatus: 'completed', lastScore: 4.2, goalsCompletion: 85,
    lastReviewDate: 'Mar 10, 2026',
    competencies: [
      { subject: 'Execution', score: 90 }, { subject: 'Collaboration', score: 82 },
      { subject: 'Communication', score: 75 }, { subject: 'Leadership', score: 68 },
      { subject: 'Innovation', score: 80 }, { subject: 'Technical', score: 95 },
    ],
    goals: [
      { id: 'g1', title: 'Reduce time-to-hire by 20%', progress: 72, status: 'on-track' },
      { id: 'g4', title: 'Grow engineering headcount to 25', progress: 60, status: 'on-track' },
    ],
    reviewHistory: [
      { cycleId: 'rc2', cycleName: '2025 Annual Performance Review', score: 4.2, completedAt: 'Jan 20, 2026' },
      { cycleId: 'rc3', cycleName: 'Engineering — Q4 Calibration', score: 4.0, completedAt: 'Jan 8, 2026' },
    ],
  },
  {
    id: 'e2', name: 'Marcus Chen', role: 'Backend Developer', department: 'Engineering',
    email: 'marcus.chen@teamtalent.com',
    reviewStatus: 'in-progress', lastScore: 3.8, goalsCompletion: 60,
    lastReviewDate: 'Mar 12, 2026',
    competencies: [
      { subject: 'Execution', score: 78 }, { subject: 'Collaboration', score: 70 },
      { subject: 'Communication', score: 62 }, { subject: 'Leadership', score: 50 },
      { subject: 'Innovation', score: 75 }, { subject: 'Technical', score: 92 },
    ],
    goals: [
      { id: 'g3', title: 'Complete SOC 2 Type II certification', progress: 45, status: 'at-risk' },
    ],
    reviewHistory: [
      { cycleId: 'rc2', cycleName: '2025 Annual Performance Review', score: 3.8, completedAt: 'Jan 22, 2026' },
      { cycleId: 'rc3', cycleName: 'Engineering — Q4 Calibration', score: 3.6, completedAt: 'Jan 9, 2026' },
    ],
  },
  {
    id: 'e3', name: 'Aisha Thompson', role: 'UX Designer', department: 'Design',
    email: 'aisha.thompson@teamtalent.com',
    reviewStatus: 'completed', lastScore: 4.7, goalsCompletion: 92,
    lastReviewDate: 'Mar 8, 2026',
    competencies: [
      { subject: 'Execution', score: 94 }, { subject: 'Collaboration', score: 88 },
      { subject: 'Communication', score: 85 }, { subject: 'Leadership', score: 72 },
      { subject: 'Innovation', score: 95 }, { subject: 'Technical', score: 80 },
    ],
    goals: [
      { id: 'g2', title: 'Launch new onboarding program', progress: 88, status: 'on-track' },
    ],
    reviewHistory: [
      { cycleId: 'rc2', cycleName: '2025 Annual Performance Review', score: 4.7, completedAt: 'Jan 18, 2026' },
    ],
  },
  {
    id: 'e4', name: 'Priya Patel', role: 'Product Manager', department: 'Product',
    email: 'priya.patel@teamtalent.com',
    reviewStatus: 'not-started', lastScore: 4.1, goalsCompletion: 75,
    lastReviewDate: 'Sep 15, 2025',
    competencies: [
      { subject: 'Execution', score: 82 }, { subject: 'Collaboration', score: 79 },
      { subject: 'Communication', score: 88 }, { subject: 'Leadership', score: 74 },
      { subject: 'Innovation', score: 70 }, { subject: 'Technical', score: 60 },
    ],
    goals: [
      { id: 'g2', title: 'Launch new onboarding program', progress: 88, status: 'on-track' },
    ],
    reviewHistory: [
      { cycleId: 'rc2', cycleName: '2025 Annual Performance Review', score: 4.1, completedAt: 'Jan 25, 2026' },
    ],
  },
  {
    id: 'e5', name: 'Carlos Rivera', role: 'Data Analyst', department: 'Analytics',
    email: 'carlos.rivera@teamtalent.com',
    reviewStatus: 'in-progress', lastScore: 3.5, goalsCompletion: 50,
    lastReviewDate: 'Mar 11, 2026',
    competencies: [
      { subject: 'Execution', score: 70 }, { subject: 'Collaboration', score: 65 },
      { subject: 'Communication', score: 60 }, { subject: 'Leadership', score: 45 },
      { subject: 'Innovation', score: 68 }, { subject: 'Technical', score: 85 },
    ],
    goals: [
      { id: 'g4', title: 'Grow engineering headcount to 25', progress: 60, status: 'on-track' },
    ],
    reviewHistory: [
      { cycleId: 'rc2', cycleName: '2025 Annual Performance Review', score: 3.5, completedAt: 'Jan 28, 2026' },
    ],
  },
  {
    id: 'e6', name: 'James Wilson', role: 'Frontend Developer', department: 'Engineering',
    email: 'james.wilson@teamtalent.com',
    reviewStatus: 'completed', lastScore: 3.2, goalsCompletion: 68,
    lastReviewDate: 'Mar 9, 2026',
    competencies: [
      { subject: 'Execution', score: 68 }, { subject: 'Collaboration', score: 72 },
      { subject: 'Communication', score: 65 }, { subject: 'Leadership', score: 42 },
      { subject: 'Innovation', score: 60 }, { subject: 'Technical', score: 82 },
    ],
    goals: [
      { id: 'g1', title: 'Reduce time-to-hire by 20%', progress: 72, status: 'on-track' },
    ],
    reviewHistory: [
      { cycleId: 'rc2', cycleName: '2025 Annual Performance Review', score: 3.2, completedAt: 'Jan 24, 2026' },
      { cycleId: 'rc3', cycleName: 'Engineering — Q4 Calibration', score: 3.0, completedAt: 'Jan 7, 2026' },
    ],
  },
];

const SEED_CYCLES: ReviewCycle[] = [
  {
    id: 'rc1',
    name: 'Q1 2026 Mid-Year Review',
    type: 'Mid-Year',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    dueDate: '2026-04-15',
    status: 'active',
    createdAt: '2026-01-02T09:00:00Z',
    participants: SEED_EMPLOYEES.map((e) => ({
      id: e.id, name: e.name, role: e.role, department: e.department,
      reviewStatus: e.reviewStatus,
      score: e.reviewStatus === 'completed' ? e.lastScore : null,
    })),
  },
  {
    id: 'rc2',
    name: '2025 Annual Performance Review',
    type: 'Annual',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    dueDate: '2026-01-31',
    status: 'completed',
    createdAt: '2025-01-03T09:00:00Z',
    participants: SEED_EMPLOYEES.map((e) => ({
      id: e.id, name: e.name, role: e.role, department: e.department,
      reviewStatus: 'completed' as ReviewStatus,
      score: e.lastScore,
    })),
  },
  {
    id: 'rc3',
    name: 'Engineering — Q4 Calibration',
    type: 'Calibration',
    startDate: '2025-10-01',
    endDate: '2025-12-31',
    dueDate: '2026-01-10',
    status: 'completed',
    createdAt: '2025-10-02T09:00:00Z',
    participants: SEED_EMPLOYEES.filter((e) => e.department === 'Engineering').map((e) => ({
      id: e.id, name: e.name, role: e.role, department: e.department,
      reviewStatus: 'completed' as ReviewStatus,
      score: e.reviewHistory.find((r) => r.cycleId === 'rc3')?.score ?? e.lastScore,
    })),
  },
  {
    id: 'rc4',
    name: 'Q2 2026 Goal Check-in',
    type: 'Check-in',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    dueDate: '2026-07-01',
    status: 'upcoming',
    createdAt: '2026-03-01T09:00:00Z',
    participants: SEED_EMPLOYEES.map((e) => ({
      id: e.id, name: e.name, role: e.role, department: e.department,
      reviewStatus: 'not-started' as ReviewStatus,
      score: null,
    })),
  },
];

const SEED_GOALS: PerformanceGoal[] = [
  {
    id: 'g1', title: 'Reduce time-to-hire by 20%', owner: 'Sarah Johnson', ownerId: 'e1',
    type: 'Company', dueDate: '2026-06-30', progress: 72, targetPct: 100,
    status: 'on-track', description: 'Streamline the hiring pipeline to reduce average time-to-hire from 45 days to 36 days through process automation and improved candidate communication.',
    createdAt: '2026-01-05T09:00:00Z',
  },
  {
    id: 'g2', title: 'Launch new onboarding program', owner: 'Priya Patel', ownerId: 'e4',
    type: 'Department', dueDate: '2026-04-30', progress: 88, targetPct: 100,
    status: 'on-track', description: 'Design and launch a fully digital onboarding experience with self-service tasks, document upload, and automated reminders.',
    createdAt: '2026-01-06T09:00:00Z',
  },
  {
    id: 'g3', title: 'Complete SOC 2 Type II certification', owner: 'Marcus Chen', ownerId: 'e2',
    type: 'Department', dueDate: '2026-03-31', progress: 45, targetPct: 100,
    status: 'at-risk', description: 'Achieve SOC 2 Type II certification to meet enterprise customer security requirements.',
    createdAt: '2026-01-07T09:00:00Z',
  },
  {
    id: 'g4', title: 'Grow engineering headcount to 25', owner: 'Carlos Rivera', ownerId: 'e5',
    type: 'Company', dueDate: '2026-12-31', progress: 60, targetPct: 100,
    status: 'on-track', description: 'Scale the engineering team from 18 to 25 FTEs with a focus on backend and infrastructure roles.',
    createdAt: '2026-01-08T09:00:00Z',
  },
  {
    id: 'g5', title: 'Implement diversity hiring targets', owner: 'Aisha Thompson', ownerId: 'e3',
    type: 'Individual', dueDate: '2026-05-15', progress: 20, targetPct: 100,
    status: 'at-risk', description: 'Define and implement measurable diversity hiring targets across all departments.',
    createdAt: '2026-01-09T09:00:00Z',
  },
];

const COMPETENCY_DATA: CompetencyItem[] = [
  { subject: 'Execution',      value: 82 },
  { subject: 'Collaboration',  value: 74 },
  { subject: 'Communication',  value: 68 },
  { subject: 'Leadership',     value: 55 },
  { subject: 'Innovation',     value: 71 },
  { subject: 'Technical',      value: 88 },
];

// ─── Store ────────────────────────────────────────────────────────────────────

const cycles    = new Map<string, ReviewCycle>(SEED_CYCLES.map((c) => [c.id, c]));
const goals     = new Map<string, PerformanceGoal>(SEED_GOALS.map((g) => [g.id, g]));
const employees = new Map<string, TeamEmployee>(SEED_EMPLOYEES.map((e) => [e.id, e]));

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const performanceService = {

  // ── Stats

  getStats(): PerformanceStats {
    const allCycles    = [...cycles.values()];
    const allGoals     = [...goals.values()];
    const allEmployees = [...employees.values()];

    const completed    = allCycles.filter((c) => c.status === 'completed').length;
    const activeCycles = allCycles.filter((c) => c.status === 'active').length;
    const onTrack      = allGoals.filter((g) => g.status === 'on-track').length;
    const atRisk       = allGoals.filter((g) => g.status === 'at-risk').length;
    const avgScore     = allEmployees.reduce((s, e) => s + e.lastScore, 0) / (allEmployees.length || 1);
    const completionRate = allCycles.length
      ? Math.round((completed / allCycles.length) * 100)
      : 0;

    return {
      completionRate,
      activeCycles,
      goalsOnTrack:        onTrack,
      totalGoals:          allGoals.length,
      avgScore:            Math.round(avgScore * 10) / 10,
      completionRateDelta: '+8% vs last cycle',
      activeCyclesNote:    activeCycles > 0 ? `${activeCycles} ending soon` : 'None active',
      goalsAtRisk:         atRisk,
      avgScoreDelta:       '+0.3 vs last cycle',
    };
  },

  // ── Review Cycles

  getCycles(): ReviewCycle[] {
    return [...cycles.values()].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  getCycleById(id: string): ReviewCycle | null {
    return cycles.get(id) ?? null;
  },

  createCycle(data: {
    name:           string;
    type:           ReviewCycleType;
    startDate:      string;
    endDate:        string;
    dueDate:        string;
    participantIds: string[];
  }): ReviewCycle {
    const participantList: CycleParticipant[] = data.participantIds
      .flatMap((eid) => {
        const emp = employees.get(eid);
        if (!emp) return [];
        const p: CycleParticipant = {
          id: emp.id, name: emp.name, role: emp.role,
          department: emp.department, reviewStatus: 'not-started', score: null,
        };
        return [p];
      });

    const now = new Date().toISOString();
    const today = new Date(data.startDate);
    const due   = new Date(data.dueDate);
    const status: CycleStatus = today > new Date() ? 'upcoming' : due < new Date() ? 'completed' : 'active';

    const cycle: ReviewCycle = {
      id: `rc${uid()}`,
      name: data.name,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      dueDate: data.dueDate,
      status,
      participants: participantList,
      createdAt: now,
    };
    cycles.set(cycle.id, cycle);
    return cycle;
  },

  // ── Goals

  getGoals(): PerformanceGoal[] {
    return [...goals.values()].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  },

  getGoalById(id: string): PerformanceGoal | null {
    return goals.get(id) ?? null;
  },

  createGoal(data: {
    title:       string;
    owner:       string;
    ownerId:     string | null;
    type:        GoalType;
    dueDate:     string;
    targetPct:   number;
    description: string;
  }): PerformanceGoal {
    const goal: PerformanceGoal = {
      id: `g${uid()}`,
      title: data.title,
      owner: data.owner,
      ownerId: data.ownerId,
      type: data.type,
      dueDate: data.dueDate,
      progress: 0,
      targetPct: data.targetPct,
      status: 'on-track',
      description: data.description,
      createdAt: new Date().toISOString(),
    };
    goals.set(goal.id, goal);
    return goal;
  },

  updateGoal(
    id: string,
    data: Partial<Pick<PerformanceGoal, 'title' | 'owner' | 'ownerId' | 'type' | 'dueDate' | 'progress' | 'targetPct' | 'status' | 'description'>>,
  ): PerformanceGoal | null {
    const goal = goals.get(id);
    if (!goal) return null;
    Object.assign(goal, data);
    return goal;
  },

  // ── Employees

  getEmployees(): TeamEmployee[] {
    return [...employees.values()];
  },

  getEmployeeById(id: string): TeamEmployee | null {
    return employees.get(id) ?? null;
  },

  addEmployee(data: {
    name:       string;
    role:       string;
    department: string;
    email:      string;
  }): TeamEmployee {
    const emp: TeamEmployee = {
      id: `e${uid()}`,
      name: data.name,
      role: data.role,
      department: data.department,
      email: data.email,
      reviewStatus: 'not-started',
      lastScore: 0,
      goalsCompletion: 0,
      lastReviewDate: '—',
      competencies: [
        { subject: 'Execution', score: 0 }, { subject: 'Collaboration', score: 0 },
        { subject: 'Communication', score: 0 }, { subject: 'Leadership', score: 0 },
        { subject: 'Innovation', score: 0 }, { subject: 'Technical', score: 0 },
      ],
      goals: [],
      reviewHistory: [],
    };
    employees.set(emp.id, emp);
    return emp;
  },

  // ── Chart data

  getScoreDistribution(): ScoreDistributionItem[] {
    const allEmployees = [...employees.values()];
    const buckets: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const e of allEmployees) {
      if (e.lastScore === 0) continue;
      const bucket = Math.min(5, Math.max(1, Math.round(e.lastScore)));
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
    return [
      { label: 'Outstanding',   score: '5', count: buckets[5] },
      { label: 'Exceeds',       score: '4', count: buckets[4] },
      { label: 'Meets',         score: '3', count: buckets[3] },
      { label: 'Below',         score: '2', count: buckets[2] },
      { label: 'Needs Improv.', score: '1', count: buckets[1] },
    ];
  },

  getCompetencyData(): CompetencyItem[] {
    const allEmployees = [...employees.values()].filter((e) => e.lastScore > 0);
    if (allEmployees.length === 0) return COMPETENCY_DATA;
    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const e of allEmployees) {
      for (const c of e.competencies) {
        totals[c.subject] = (totals[c.subject] ?? 0) + c.score;
        counts[c.subject] = (counts[c.subject] ?? 0) + 1;
      }
    }
    return Object.entries(totals).map(([subject, total]) => ({
      subject,
      value: Math.round(total / (counts[subject] ?? 1)),
    }));
  },

  // ── Users list (for modals)

  getUserList(): { id: string; name: string; role: string; department: string }[] {
    return [...employees.values()].map((e) => ({
      id: e.id, name: e.name, role: e.role, department: e.department,
    }));
  },
};
