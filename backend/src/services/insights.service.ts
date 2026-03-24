/**
 * @file insights.service.ts
 * @description In-memory talent insights store.
 * Returns period-sliced analytics data derived from deterministic seed values.
 */

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
  month:        string;
  timeToHire:   number;
  timeToFill:   number;
}

export interface PipelinePoint {
  month:     string;
  Sourced:   number;
  Screened:  number;
  Interview: number;
  Offer:     number;
}

export interface SourceItem {
  name:    string;
  value:   number; // percentage
  hires:   number;
  color:   string;
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

// ─── Full 12-month seed ───────────────────────────────────────────────────────

const TREND_12M: TrendPoint[] = [
  { month: 'Apr', timeToHire: 34, timeToFill: 48 },
  { month: 'May', timeToHire: 31, timeToFill: 45 },
  { month: 'Jun', timeToHire: 29, timeToFill: 44 },
  { month: 'Jul', timeToHire: 33, timeToFill: 47 },
  { month: 'Aug', timeToHire: 28, timeToFill: 41 },
  { month: 'Sep', timeToHire: 26, timeToFill: 39 },
  { month: 'Oct', timeToHire: 30, timeToFill: 43 },
  { month: 'Nov', timeToHire: 27, timeToFill: 38 },
  { month: 'Dec', timeToHire: 25, timeToFill: 36 },
  { month: 'Jan', timeToHire: 28, timeToFill: 40 },
  { month: 'Feb', timeToHire: 26, timeToFill: 37 },
  { month: 'Mar', timeToHire: 27, timeToFill: 38 },
];

const PIPELINE_12M: PipelinePoint[] = [
  { month: 'Apr', Sourced: 110, Screened: 68,  Interview: 30, Offer:  9 },
  { month: 'May', Sourced: 122, Screened: 74,  Interview: 34, Offer: 11 },
  { month: 'Jun', Sourced: 131, Screened: 80,  Interview: 38, Offer: 11 },
  { month: 'Jul', Sourced: 118, Screened: 72,  Interview: 33, Offer: 10 },
  { month: 'Aug', Sourced: 105, Screened: 64,  Interview: 29, Offer:  8 },
  { month: 'Sep', Sourced: 138, Screened: 85,  Interview: 41, Offer: 12 },
  { month: 'Oct', Sourced: 142, Screened: 89,  Interview: 42, Offer: 12 },
  { month: 'Nov', Sourced: 128, Screened: 76,  Interview: 38, Offer: 10 },
  { month: 'Dec', Sourced:  95, Screened: 58,  Interview: 27, Offer:  8 },
  { month: 'Jan', Sourced: 167, Screened: 104, Interview: 51, Offer: 15 },
  { month: 'Feb', Sourced: 154, Screened:  93, Interview: 46, Offer: 13 },
  { month: 'Mar', Sourced: 178, Screened: 110, Interview: 54, Offer: 17 },
];

// ─── Per-period helpers ───────────────────────────────────────────────────────

function slice<T>(arr: T[], period: Period): T[] {
  const n = period === '30d' ? 2 : period === '90d' ? 3 : period === '6m' ? 6 : 12;
  return arr.slice(-n);
}

const STATS_BY_PERIOD: Record<Period, InsightsStats> = {
  '30d': {
    totalCandidatesSourced: 332,
    activePipelines: 14,
    avgTimeToHire: 27,
    offersAcceptedRate: 72,
    candidatesDelta: '+6.4%',
    pipelinesDelta:  '+2.1%',
    timeToHireDelta: '−3.6%',
    offersDelta:     '+3.7%',
    candidatesPositive: true,
    pipelinesPositive:  true,
    timeToHirePositive: false,
    offersPositive:     true,
  },
  '90d': {
    totalCandidatesSourced: 1238,
    activePipelines: 12,
    avgTimeToHire: 27,
    offersAcceptedRate: 70,
    candidatesDelta: '+4.2%',
    pipelinesDelta:  '+1.4%',
    timeToHireDelta: '−2.1%',
    offersDelta:     '+2.3%',
    candidatesPositive: true,
    pipelinesPositive:  true,
    timeToHirePositive: false,
    offersPositive:     true,
  },
  '6m': {
    totalCandidatesSourced: 3864,
    activePipelines: 11,
    avgTimeToHire: 28,
    offersAcceptedRate: 69,
    candidatesDelta: '+5.1%',
    pipelinesDelta:  '+0.8%',
    timeToHireDelta: '−1.4%',
    offersDelta:     '+1.9%',
    candidatesPositive: true,
    pipelinesPositive:  true,
    timeToHirePositive: false,
    offersPositive:     true,
  },
  '12m': {
    totalCandidatesSourced: 8742,
    activePipelines: 14,
    avgTimeToHire: 29,
    offersAcceptedRate: 68,
    candidatesDelta: '+6.4%',
    pipelinesDelta:  '+2.1%',
    timeToHireDelta: '−0.8%',
    offersDelta:     '+3.7%',
    candidatesPositive: true,
    pipelinesPositive:  true,
    timeToHirePositive: false,
    offersPositive:     true,
  },
};

const SOURCES_BY_PERIOD: Record<Period, SourceItem[]> = {
  '30d': [
    { name: 'LinkedIn',  value: 48, hires: 14, color: '#0A0A0A' },
    { name: 'Referral',  value: 20, hires:  8, color: '#22C55E' },
    { name: 'AI Agent',  value: 18, hires:  7, color: '#F97316' },
    { name: 'Job Board', value: 14, hires:  4, color: '#6B7280' },
  ],
  '90d': [
    { name: 'LinkedIn',  value: 44, hires: 31, color: '#0A0A0A' },
    { name: 'AI Agent',  value: 24, hires: 18, color: '#F97316' },
    { name: 'Referral',  value: 20, hires: 14, color: '#22C55E' },
    { name: 'GitHub',    value: 12, hires:  9, color: '#3B82F6' },
  ],
  '6m': [
    { name: 'LinkedIn',  value: 45, hires: 29, color: '#0A0A0A' },
    { name: 'AI Agent',  value: 23, hires: 17, color: '#F97316' },
    { name: 'Referral',  value: 19, hires: 14, color: '#22C55E' },
    { name: 'GitHub',    value: 13, hires:  9, color: '#3B82F6' },
  ],
  '12m': [
    { name: 'LinkedIn',  value: 45, hires: 38, color: '#0A0A0A' },
    { name: 'AI Agent',  value: 22, hires: 19, color: '#F97316' },
    { name: 'GitHub',    value: 20, hires: 12, color: '#3B82F6' },
    { name: 'Referral',  value: 13, hires: 24, color: '#22C55E' },
  ],
};

// ─── Saved reports store ──────────────────────────────────────────────────────

const reports = new Map<string, SavedReport>([
  ['r1', {
    id: 'r1', name: 'Q1 Sourcing Overview',
    description: 'Sourcing trends and channel insights',
    type: 'Scheduled', createdDate: '2026-01-15', lastRun: '2026-03-01',
    data: { period: '90d', stats: STATS_BY_PERIOD['90d'], sources: SOURCES_BY_PERIOD['90d'] },
  }],
  ['r2', {
    id: 'r2', name: 'Engineering Pipeline Health',
    description: 'Stage velocity and bottleneck analysis',
    type: 'Manual', createdDate: '2026-02-02', lastRun: '2026-03-08',
    data: { period: '6m', pipeline: PIPELINE_12M.slice(-6) },
  }],
  ['r3', {
    id: 'r3', name: 'Diversity Sourcing Snapshot',
    description: 'Demographic sourcing breakdown for leadership roles',
    type: 'Scheduled', createdDate: '2025-12-10', lastRun: '2026-03-02',
    data: { period: '12m', sources: SOURCES_BY_PERIOD['12m'] },
  }],
  ['r4', {
    id: 'r4', name: 'Referral Performance — March',
    description: 'Referrals converted and time-to-hire',
    type: 'Manual', createdDate: '2026-03-05', lastRun: '2026-03-09',
    data: { period: '30d', sources: SOURCES_BY_PERIOD['30d'] },
  }],
]);

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Service ──────────────────────────────────────────────────────────────────

export const insightsService = {

  getStats(period: Period): InsightsStats {
    return STATS_BY_PERIOD[period] ?? STATS_BY_PERIOD['12m'];
  },

  getTrends(period: Period): TrendPoint[] {
    return slice(TREND_12M, period);
  },

  getPipeline(period: Period): PipelinePoint[] {
    return slice(PIPELINE_12M, period);
  },

  getSources(period: Period): SourceItem[] {
    return SOURCES_BY_PERIOD[period] ?? SOURCES_BY_PERIOD['12m'];
  },

  getAll(period: Period): InsightsData {
    return {
      stats:    insightsService.getStats(period),
      trends:   insightsService.getTrends(period),
      pipeline: insightsService.getPipeline(period),
      sources:  insightsService.getSources(period),
    };
  },

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
