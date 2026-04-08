/**
 * @file insights.service.ts
 * @description Talent insights derived from real Prisma data.
 * Saved-reports CRUD remains in-memory (will move to DB in a later task).
 */

import { prisma } from '../lib/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Period = '30d' | '90d' | '6m' | '12m';

export interface InsightsStats {
  totalCandidatesSourced: number;
  activePipelines:        number;
  avgTimeToHire:          number;
  offersAcceptedRate:     number;
  candidatesDelta:        string;
  pipelinesDelta:         string;
  timeToHireDelta:        string;
  offersDelta:            string;
  candidatesPositive:     boolean;
  pipelinesPositive:      boolean;
  timeToHirePositive:     boolean;
  offersPositive:         boolean;
}

export interface TrendPoint {
  month:      string;
  timeToHire: number;
  timeToFill: number;
}

export interface PipelinePoint {
  month:     string;
  Sourced:   number;
  Screened:  number;
  Interview: number;
  Offer:     number;
}

export interface SourceItem {
  name:  string;
  value: number;
  hires: number;
  color: string;
}

export interface InsightsData {
  stats:    InsightsStats;
  trends:   TrendPoint[];
  pipeline: PipelinePoint[];
  sources:  SourceItem[];
}

export interface SavedReport {
  id:          string;
  name:        string;
  description: string;
  type:        'Scheduled' | 'Manual';
  createdDate: string;
  lastRun:     string;
  data:        Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  REFERRAL:   '#22C55E',
  JOB_BOARD:  '#6B7280',
  DIRECT:     '#3B82F6',
  AGENCY:     '#F97316',
  AI_SOURCED: '#F97316',
};

const SOURCE_LABELS: Record<string, string> = {
  REFERRAL:   'Referral',
  JOB_BOARD:  'Job Board',
  DIRECT:     'Direct',
  AGENCY:     'Agency',
  AI_SOURCED: 'AI Agent',
};

function periodToDate(period: Period): Date {
  const d = new Date();
  switch (period) {
    case '30d':  d.setDate(d.getDate() - 30); break;
    case '90d':  d.setDate(d.getDate() - 90); break;
    case '6m':   d.setMonth(d.getMonth() - 6); break;
    case '12m':  d.setMonth(d.getMonth() - 12); break;
  }
  return d;
}

/** Short month name from a Date */
function monthLabel(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short' });
}

/** Generate the list of month labels for the last N months including current */
function monthsInPeriod(period: Period): string[] {
  const count = period === '30d' ? 2 : period === '90d' ? 3 : period === '6m' ? 6 : 12;
  const months: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthLabel(d));
  }
  return months;
}

// ─── Saved reports store (in-memory — moves to DB in task 2D) ────────────────

const reports = new Map<string, SavedReport>();
function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Service ──────────────────────────────────────────────────────────────────

export const insightsService = {

  async getStats(period: Period): Promise<InsightsStats> {
    const since = periodToDate(period);

    // Total candidates sourced in period
    const totalCandidatesSourced = await prisma.candidate.count({
      where: { createdAt: { gte: since } },
    });

    // Active pipelines = open jobs
    const activePipelines = await prisma.jobPosting.count({
      where: { status: 'OPEN' },
    });

    // Avg time to hire: applications that reached HIRED status within period
    const hiredApps = await prisma.application.findMany({
      where: { status: 'HIRED', updatedAt: { gte: since } },
      select: { appliedAt: true, updatedAt: true },
    });
    let avgTimeToHire = 0;
    if (hiredApps.length > 0) {
      const totalDays = hiredApps.reduce((sum, a) => {
        const days = Math.round((a.updatedAt.getTime() - a.appliedAt.getTime()) / (1000 * 60 * 60 * 24));
        return sum + Math.max(days, 0);
      }, 0);
      avgTimeToHire = Math.round(totalDays / hiredApps.length);
    }

    // Offers accepted rate
    const sentOffers = await prisma.offer.count({
      where: { status: { in: ['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] } },
    });
    const acceptedOffers = await prisma.offer.count({
      where: { status: 'ACCEPTED' },
    });
    const offersAcceptedRate = sentOffers > 0 ? Math.round((acceptedOffers / sentOffers) * 100) : 0;

    // Delta calculations: compare current period to the preceding period of same length
    const prevStart = new Date(since);
    const periodMs = Date.now() - since.getTime();
    prevStart.setTime(prevStart.getTime() - periodMs);

    const prevCandidates = await prisma.candidate.count({
      where: { createdAt: { gte: prevStart, lt: since } },
    });
    const candDelta = prevCandidates > 0
      ? ((totalCandidatesSourced - prevCandidates) / prevCandidates * 100)
      : (totalCandidatesSourced > 0 ? 100 : 0);

    const prevHired = await prisma.application.findMany({
      where: { status: 'HIRED', updatedAt: { gte: prevStart, lt: since } },
      select: { appliedAt: true, updatedAt: true },
    });
    let prevAvgTTH = 0;
    if (prevHired.length > 0) {
      const total = prevHired.reduce((sum, a) => {
        return sum + Math.max(Math.round((a.updatedAt.getTime() - a.appliedAt.getTime()) / (1000 * 60 * 60 * 24)), 0);
      }, 0);
      prevAvgTTH = Math.round(total / prevHired.length);
    }
    const tthDelta = prevAvgTTH > 0
      ? ((avgTimeToHire - prevAvgTTH) / prevAvgTTH * 100)
      : 0;

    const prevSent = await prisma.offer.count({
      where: { status: { in: ['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] }, createdAt: { gte: prevStart, lt: since } },
    });
    const prevAccepted = await prisma.offer.count({
      where: { status: 'ACCEPTED', createdAt: { gte: prevStart, lt: since } },
    });
    const prevRate = prevSent > 0 ? Math.round((prevAccepted / prevSent) * 100) : 0;
    const offerDelta = prevRate > 0 ? offersAcceptedRate - prevRate : 0;

    function fmt(n: number): string {
      const sign = n >= 0 ? '+' : '−';
      return `${sign}${Math.abs(n).toFixed(1)}%`;
    }

    return {
      totalCandidatesSourced,
      activePipelines,
      avgTimeToHire,
      offersAcceptedRate,
      candidatesDelta:    fmt(candDelta),
      pipelinesDelta:     '+0.0%', // pipelines is a point-in-time count, delta not meaningful
      timeToHireDelta:    fmt(tthDelta),
      offersDelta:        fmt(offerDelta),
      candidatesPositive: candDelta >= 0,
      pipelinesPositive:  true,
      timeToHirePositive: tthDelta < 0, // lower is better
      offersPositive:     offerDelta >= 0,
    };
  },

  async getTrends(period: Period): Promise<TrendPoint[]> {
    const months = monthsInPeriod(period);
    const since = periodToDate(period);

    // Get all hired applications in the period for time-to-hire/fill
    const apps = await prisma.application.findMany({
      where: { updatedAt: { gte: since } },
      select: { status: true, appliedAt: true, updatedAt: true },
    });

    // Group hired apps by month of updatedAt
    const hiredByMonth = new Map<string, { tthDays: number[]; ttfDays: number[] }>();
    for (const m of months) hiredByMonth.set(m, { tthDays: [], ttfDays: [] });

    for (const a of apps) {
      if (a.status !== 'HIRED') continue;
      const m = monthLabel(a.updatedAt);
      const bucket = hiredByMonth.get(m);
      if (!bucket) continue;
      const days = Math.max(Math.round((a.updatedAt.getTime() - a.appliedAt.getTime()) / (1000 * 60 * 60 * 24)), 0);
      bucket.tthDays.push(days);
      // timeToFill approximated as timeToHire + 7 (offer/onboarding buffer)
      bucket.ttfDays.push(days + 7);
    }

    return months.map((m) => {
      const bucket = hiredByMonth.get(m)!;
      const avgTTH = bucket.tthDays.length > 0
        ? Math.round(bucket.tthDays.reduce((a, b) => a + b, 0) / bucket.tthDays.length)
        : 0;
      const avgTTF = bucket.ttfDays.length > 0
        ? Math.round(bucket.ttfDays.reduce((a, b) => a + b, 0) / bucket.ttfDays.length)
        : 0;
      return { month: m, timeToHire: avgTTH, timeToFill: avgTTF };
    });
  },

  async getPipeline(period: Period): Promise<PipelinePoint[]> {
    const months = monthsInPeriod(period);
    const since = periodToDate(period);

    const apps = await prisma.application.findMany({
      where: { appliedAt: { gte: since } },
      select: { status: true, appliedAt: true },
    });

    // Map ApplicationStatus to pipeline stage
    const stageMap: Record<string, keyof Omit<PipelinePoint, 'month'>> = {
      APPLIED:    'Sourced',
      SCREENING:  'Screened',
      INTERVIEW:  'Interview',
      OFFER:      'Offer',
      HIRED:      'Offer',    // hired came through offer stage
      REJECTED:   'Screened', // rejected at screening by default
    };

    const buckets = new Map<string, PipelinePoint>();
    for (const m of months) buckets.set(m, { month: m, Sourced: 0, Screened: 0, Interview: 0, Offer: 0 });

    for (const a of apps) {
      const m = monthLabel(a.appliedAt);
      const bucket = buckets.get(m);
      if (!bucket) continue;

      // Count the application in its current stage AND all preceding stages
      const stages: (keyof Omit<PipelinePoint, 'month'>)[] = ['Sourced', 'Screened', 'Interview', 'Offer'];
      const currentStage = stageMap[a.status] ?? 'Sourced';
      const currentIdx = stages.indexOf(currentStage);
      for (let i = 0; i <= currentIdx; i++) {
        bucket[stages[i]]++;
      }
    }

    return months.map((m) => buckets.get(m)!);
  },

  async getSources(period: Period): Promise<SourceItem[]> {
    const since = periodToDate(period);

    // Source distribution: all candidates in period
    const groups = await prisma.candidate.groupBy({
      by: ['source'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    const total = groups.reduce((s, g) => s + g._count._all, 0);

    // Hires per source: candidates who have a HIRED application
    const hiredCandidates = await prisma.application.findMany({
      where: { status: 'HIRED', appliedAt: { gte: since } },
      select: { candidate: { select: { source: true } } },
    });
    const hiresBySource = new Map<string, number>();
    for (const h of hiredCandidates) {
      const src = h.candidate.source;
      hiresBySource.set(src, (hiresBySource.get(src) ?? 0) + 1);
    }

    return groups
      .map((g) => ({
        name:  SOURCE_LABELS[g.source] ?? g.source,
        value: total > 0 ? Math.round((g._count._all / total) * 100) : 0,
        hires: hiresBySource.get(g.source) ?? 0,
        color: SOURCE_COLORS[g.source] ?? '#6B7280',
      }))
      .sort((a, b) => b.value - a.value);
  },

  async getAll(period: Period): Promise<InsightsData> {
    const [stats, trends, pipeline, sources] = await Promise.all([
      insightsService.getStats(period),
      insightsService.getTrends(period),
      insightsService.getPipeline(period),
      insightsService.getSources(period),
    ]);
    return { stats, trends, pipeline, sources };
  },

  // ── Saved reports (in-memory, moves to DB in task 2D) ─────────────────────

  getReports(): SavedReport[] {
    return [...reports.values()].sort(
      (a, b) => new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime(),
    );
  },

  getReportById(id: string): SavedReport | null {
    return reports.get(id) ?? null;
  },

  deleteReport(id: string): boolean {
    return reports.delete(id);
  },

  createReport(data: Omit<SavedReport, 'id'>): SavedReport {
    const report: SavedReport = { id: `r${uid()}`, ...data };
    reports.set(report.id, report);
    return report;
  },
};
