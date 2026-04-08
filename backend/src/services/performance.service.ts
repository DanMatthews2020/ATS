/**
 * @file performance.service.ts
 * @description Performance management backed by Prisma models:
 * PerformanceCycle, PerformanceReview, Goal.
 * Employee data pulled from existing Employee model.
 */

import { prisma } from '../lib/prisma';

// ─── Types (unchanged — frontend depends on these) ───────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCOPE_TO_TYPE: Record<string, GoalType> = {
  company:    'Company',
  department: 'Department',
  individual: 'Individual',
};
const TYPE_TO_SCOPE: Record<string, string> = {
  Company:    'company',
  Department: 'department',
  Individual: 'individual',
};

function mapGoalStatus(s: string): GoalStatus {
  if (s === 'on_track' || s === 'on-track') return 'on-track';
  if (s === 'at_risk' || s === 'at-risk') return 'at-risk';
  if (s === 'completed') return 'completed';
  return 'on-track';
}

function mapReviewStatus(s: string): ReviewStatus {
  if (s === 'completed') return 'completed';
  if (s === 'in_progress' || s === 'in-progress') return 'in-progress';
  return 'not-started';
}

function mapCycleStatus(s: string): CycleStatus {
  if (s === 'active') return 'active';
  if (s === 'completed') return 'completed';
  return 'upcoming';
}

// Get name from employee's user or candidate relations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function empName(emp: any): string {
  const first = emp.user?.firstName ?? emp.candidate?.firstName ?? '';
  const last  = emp.user?.lastName  ?? emp.candidate?.lastName  ?? '';
  return `${first} ${last}`.trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function empEmail(emp: any): string {
  return emp.user?.email ?? emp.candidate?.email ?? '';
}

const employeeInclude = {
  user:      { select: { firstName: true, lastName: true, email: true } },
  candidate: { select: { firstName: true, lastName: true, email: true } },
} as const;

const DEFAULT_COMPETENCIES_CHART: CompetencyItem[] = [
  { subject: 'Execution',     value: 0 },
  { subject: 'Collaboration', value: 0 },
  { subject: 'Communication', value: 0 },
  { subject: 'Leadership',    value: 0 },
  { subject: 'Innovation',    value: 0 },
  { subject: 'Technical',     value: 0 },
];

const DEFAULT_COMPETENCIES_EMP: { subject: string; score: number }[] = [
  { subject: 'Execution',     score: 0 },
  { subject: 'Collaboration', score: 0 },
  { subject: 'Communication', score: 0 },
  { subject: 'Leadership',    score: 0 },
  { subject: 'Innovation',    score: 0 },
  { subject: 'Technical',     score: 0 },
];

// ─── Service ──────────────────────────────────────────────────────────────────

export const performanceService = {

  // ── Stats

  async getStats(): Promise<PerformanceStats> {
    const allCycles = await prisma.performanceCycle.findMany();
    const allGoals  = await prisma.goal.findMany();
    const reviews   = await prisma.performanceReview.findMany({
      where: { status: 'completed' },
    });

    const completed    = allCycles.filter((c) => c.status === 'completed').length;
    const activeCycles = allCycles.filter((c) => c.status === 'active').length;
    const onTrack      = allGoals.filter((g) => mapGoalStatus(g.status) === 'on-track').length;
    const atRisk       = allGoals.filter((g) => mapGoalStatus(g.status) === 'at-risk').length;

    const scores = reviews.filter((r) => r.overallScore !== null).map((r) => r.overallScore!);
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
      : 0;

    const completionRate = allCycles.length
      ? Math.round((completed / allCycles.length) * 100)
      : 0;

    return {
      completionRate,
      activeCycles,
      goalsOnTrack:        onTrack,
      totalGoals:          allGoals.length,
      avgScore,
      completionRateDelta: completionRate > 0 ? `+${completionRate}% vs last cycle` : 'No data yet',
      activeCyclesNote:    activeCycles > 0 ? `${activeCycles} ending soon` : 'None active',
      goalsAtRisk:         atRisk,
      avgScoreDelta:       avgScore > 0 ? `${avgScore.toFixed(1)} avg` : 'No scores yet',
    };
  },

  // ── Review Cycles

  async getCycles(): Promise<ReviewCycle[]> {
    const rows = await prisma.performanceCycle.findMany({
      include: {
        reviews: {
          select: { employeeId: true, status: true, overallScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch all employees referenced in reviews for name resolution
    const empIds = new Set<string>();
    for (const c of rows) for (const r of c.reviews) empIds.add(r.employeeId);
    const emps = empIds.size > 0
      ? await prisma.employee.findMany({
          where: { id: { in: [...empIds] } },
          select: { id: true, jobTitle: true, department: true, user: employeeInclude.user, candidate: employeeInclude.candidate },
        })
      : [];
    const empMap = new Map(emps.map((e) => [e.id, e]));

    return rows.map((c) => ({
      id:        c.id,
      name:      c.name,
      type:      c.cycleType as ReviewCycleType,
      startDate: c.periodStart.toISOString().slice(0, 10),
      endDate:   c.periodEnd.toISOString().slice(0, 10),
      dueDate:   c.dueDate.toISOString().slice(0, 10),
      status:    mapCycleStatus(c.status),
      createdAt: c.createdAt.toISOString(),
      participants: c.reviews.map((r) => {
        const emp = empMap.get(r.employeeId);
        return {
          id:           r.employeeId,
          name:         emp ? empName(emp) : 'Unknown',
          role:         emp?.jobTitle ?? '',
          department:   emp?.department ?? '',
          reviewStatus: mapReviewStatus(r.status),
          score:        r.overallScore,
        };
      }),
    }));
  },

  async getCycleById(id: string): Promise<ReviewCycle | null> {
    const cycles = await this.getCycles();
    return cycles.find((c) => c.id === id) ?? null;
  },

  async createCycle(data: {
    name:           string;
    type:           ReviewCycleType;
    startDate:      string;
    endDate:        string;
    dueDate:        string;
    participantIds: string[];
  }): Promise<ReviewCycle> {
    const start = new Date(data.startDate);
    const due   = new Date(data.dueDate);
    const now   = new Date();
    const status = start > now ? 'upcoming' : due < now ? 'completed' : 'active';

    const cycle = await prisma.performanceCycle.create({
      data: {
        name:        data.name,
        cycleType:   data.type,
        periodStart: start,
        periodEnd:   new Date(data.endDate),
        dueDate:     due,
        status,
        reviews: {
          create: data.participantIds.map((empId) => ({
            employeeId: empId,
            reviewerId: empId, // self-review default
            status:     'not_started',
          })),
        },
      },
      include: { reviews: true },
    });

    // Resolve names
    const empIds = cycle.reviews.map((r) => r.employeeId);
    const emps = empIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: empIds } },
          select: { id: true, jobTitle: true, department: true, user: employeeInclude.user, candidate: employeeInclude.candidate },
        })
      : [];
    const empMap = new Map(emps.map((e) => [e.id, e]));

    return {
      id:        cycle.id,
      name:      cycle.name,
      type:      cycle.cycleType as ReviewCycleType,
      startDate: cycle.periodStart.toISOString().slice(0, 10),
      endDate:   cycle.periodEnd.toISOString().slice(0, 10),
      dueDate:   cycle.dueDate.toISOString().slice(0, 10),
      status:    mapCycleStatus(cycle.status),
      createdAt: cycle.createdAt.toISOString(),
      participants: cycle.reviews.map((r) => {
        const emp = empMap.get(r.employeeId);
        return {
          id:           r.employeeId,
          name:         emp ? empName(emp) : 'Unknown',
          role:         emp?.jobTitle ?? '',
          department:   emp?.department ?? '',
          reviewStatus: mapReviewStatus(r.status),
          score:        r.overallScore,
        };
      }),
    };
  },

  // ── Goals

  async getGoals(): Promise<PerformanceGoal[]> {
    const rows = await prisma.goal.findMany({ orderBy: { createdAt: 'desc' } });

    // Resolve owner names from Employee table
    const ownerIds = [...new Set(rows.map((g) => g.ownerId))];
    const emps = ownerIds.length > 0
      ? await prisma.employee.findMany({
          where: { id: { in: ownerIds } },
          include: employeeInclude,
        })
      : [];
    const empMap = new Map(emps.map((e) => [e.id, e]));

    return rows.map((g) => {
      const emp = empMap.get(g.ownerId);
      return {
        id:          g.id,
        title:       g.title,
        owner:       emp ? empName(emp) : 'Unknown',
        ownerId:     g.ownerId,
        type:        SCOPE_TO_TYPE[g.scope] ?? 'Individual',
        dueDate:     g.dueDate ? g.dueDate.toISOString().slice(0, 10) : '',
        progress:    g.progress,
        targetPct:   100,
        status:      mapGoalStatus(g.status),
        description: g.description ?? '',
        createdAt:   g.createdAt.toISOString(),
      };
    });
  },

  async getGoalById(id: string): Promise<PerformanceGoal | null> {
    const goals = await this.getGoals();
    return goals.find((g) => g.id === id) ?? null;
  },

  async createGoal(data: {
    title:       string;
    owner:       string;
    ownerId:     string | null;
    type:        GoalType;
    dueDate:     string;
    targetPct:   number;
    description: string;
  }): Promise<PerformanceGoal> {
    const row = await prisma.goal.create({
      data: {
        title:       data.title,
        description: data.description,
        ownerId:     data.ownerId ?? '',
        scope:       TYPE_TO_SCOPE[data.type] ?? 'individual',
        dueDate:     data.dueDate ? new Date(data.dueDate) : null,
        progress:    0,
        status:      'on_track',
      },
    });

    return {
      id:          row.id,
      title:       row.title,
      owner:       data.owner,
      ownerId:     row.ownerId,
      type:        data.type,
      dueDate:     row.dueDate ? row.dueDate.toISOString().slice(0, 10) : '',
      progress:    row.progress,
      targetPct:   data.targetPct,
      status:      'on-track',
      description: row.description ?? '',
      createdAt:   row.createdAt.toISOString(),
    };
  },

  async updateGoal(
    id: string,
    data: Partial<Pick<PerformanceGoal, 'title' | 'owner' | 'ownerId' | 'type' | 'dueDate' | 'progress' | 'targetPct' | 'status' | 'description'>>,
  ): Promise<PerformanceGoal | null> {
    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing) return null;

    const patch: Record<string, unknown> = {};
    if (data.title !== undefined)       patch.title       = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.ownerId !== undefined)     patch.ownerId     = data.ownerId ?? '';
    if (data.type !== undefined)        patch.scope       = TYPE_TO_SCOPE[data.type] ?? 'individual';
    if (data.progress !== undefined)    patch.progress    = data.progress;
    if (data.status !== undefined)      patch.status      = data.status === 'on-track' ? 'on_track' : data.status === 'at-risk' ? 'at_risk' : data.status;
    if (data.dueDate !== undefined)     patch.dueDate     = new Date(data.dueDate);

    await prisma.goal.update({ where: { id }, data: patch });

    const goals = await this.getGoals();
    return goals.find((g) => g.id === id) ?? null;
  },

  // ── Employees (derived from real Employee table + performance data)

  async getEmployees(): Promise<TeamEmployee[]> {
    const emps = await prisma.employee.findMany({
      include: employeeInclude,
    });

    const reviews = await prisma.performanceReview.findMany({
      include: { cycle: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const goals = await prisma.goal.findMany();

    return emps.map((emp) => {
      const name = empName(emp);
      const email = empEmail(emp);
      const empReviews = reviews.filter((r) => r.employeeId === emp.id);
      const completedReviews = empReviews.filter((r) => r.status === 'completed');
      const latestReview = completedReviews[0];
      const lastScore = latestReview?.overallScore ?? 0;

      const empGoals = goals.filter((g) => g.ownerId === emp.id);
      const completedGoals = empGoals.filter((g) => g.status === 'completed').length;
      const goalsCompletion = empGoals.length > 0 ? Math.round((completedGoals / empGoals.length) * 100) : 0;

      // Determine current review status from the most recent review
      const latestAny = empReviews[0];
      const reviewStatus: ReviewStatus = latestAny ? mapReviewStatus(latestAny.status) : 'not-started';

      return {
        id:              emp.id,
        name,
        role:            emp.jobTitle,
        department:      emp.department,
        email,
        reviewStatus,
        lastScore,
        goalsCompletion,
        lastReviewDate:  latestReview?.submittedAt
          ? latestReview.submittedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—',
        competencies:    latestReview?.scores
          ? (latestReview.scores as { subject: string; score: number }[])
          : DEFAULT_COMPETENCIES_EMP.map((c) => ({ ...c })),
        goals:           empGoals.map((g) => ({
          id:       g.id,
          title:    g.title,
          progress: g.progress,
          status:   mapGoalStatus(g.status),
        })),
        reviewHistory:   completedReviews.map((r) => ({
          cycleId:     r.cycleId,
          cycleName:   r.cycle.name,
          score:       r.overallScore ?? 0,
          completedAt: r.submittedAt
            ? r.submittedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—',
        })),
      };
    });
  },

  async getEmployeeById(id: string): Promise<TeamEmployee | null> {
    const emps = await this.getEmployees();
    return emps.find((e) => e.id === id) ?? null;
  },

  async addEmployee(data: {
    name:       string;
    role:       string;
    department: string;
    email:      string;
  }): Promise<TeamEmployee> {
    // Find or create a candidate for the employee
    let candidate = await prisma.candidate.findUnique({ where: { email: data.email } });
    if (!candidate && data.email) {
      const [firstName = '', ...rest] = data.name.split(' ');
      candidate = await prisma.candidate.create({
        data: {
          firstName,
          lastName: rest.join(' '),
          email: data.email,
          source: 'DIRECT',
        },
      });
    }

    const count = await prisma.employee.count();
    const emp = await prisma.employee.create({
      data: {
        employeeNumber: `EMP-${String(count + 1).padStart(4, '0')}`,
        candidateId:    candidate?.id,
        department:     data.department,
        jobTitle:       data.role || 'Team Member',
        employmentType: 'FULL_TIME',
        status:         'ACTIVE',
        startDate:      new Date(),
      },
      include: employeeInclude,
    });

    return {
      id:              emp.id,
      name:            empName(emp),
      role:            emp.jobTitle,
      department:      emp.department,
      email:           empEmail(emp),
      reviewStatus:    'not-started',
      lastScore:       0,
      goalsCompletion: 0,
      lastReviewDate:  '—',
      competencies:    DEFAULT_COMPETENCIES_EMP.map((c) => ({ ...c })),
      goals:           [],
      reviewHistory:   [],
    };
  },

  // ── Chart data

  async getScoreDistribution(): Promise<ScoreDistributionItem[]> {
    const reviews = await prisma.performanceReview.findMany({
      where: { status: 'completed', overallScore: { not: null } },
      select: { overallScore: true },
    });

    const buckets: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      const bucket = Math.min(5, Math.max(1, Math.round(r.overallScore!)));
      buckets[bucket]++;
    }

    return [
      { label: 'Outstanding',   score: '5', count: buckets[5] },
      { label: 'Exceeds',       score: '4', count: buckets[4] },
      { label: 'Meets',         score: '3', count: buckets[3] },
      { label: 'Below',         score: '2', count: buckets[2] },
      { label: 'Needs Improv.', score: '1', count: buckets[1] },
    ];
  },

  async getCompetencyData(): Promise<CompetencyItem[]> {
    const allReviews = await prisma.performanceReview.findMany({
      where: { status: 'completed' },
      select: { scores: true },
    });
    const reviews = allReviews.filter((r) => r.scores !== null);

    if (reviews.length === 0) return DEFAULT_COMPETENCIES_CHART;

    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const r of reviews) {
      const scores = r.scores as { subject: string; score: number }[];
      if (!Array.isArray(scores)) continue;
      for (const s of scores) {
        totals[s.subject] = (totals[s.subject] ?? 0) + s.score;
        counts[s.subject] = (counts[s.subject] ?? 0) + 1;
      }
    }

    if (Object.keys(totals).length === 0) return DEFAULT_COMPETENCIES_CHART;

    return Object.entries(totals).map(([subject, total]) => ({
      subject,
      value: Math.round(total / (counts[subject] ?? 1)),
    }));
  },

  // ── Users list (for modals)

  async getUserList(): Promise<{ id: string; name: string; role: string; department: string }[]> {
    const emps = await prisma.employee.findMany({
      include: employeeInclude,
    });
    return emps.map((e) => ({
      id:         e.id,
      name:       empName(e),
      role:       e.jobTitle,
      department: e.department,
    }));
  },
};
