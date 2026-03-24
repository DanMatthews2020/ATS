/**
 * @file reports.service.ts
 * @description In-memory reports store. Runs transition from 'processing' →
 * 'completed' after a configurable delay so the frontend can poll realistically.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CategoryId =
  | 'workforce'
  | 'talent-acquisition'
  | 'performance'
  | 'compensation'
  | 'learning';

export type RunStatus   = 'completed' | 'processing' | 'failed';
export type OutputFormat = 'PDF' | 'CSV' | 'Excel';
export type Frequency   = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';

export interface ReportRun {
  id:          string;
  reportId:    string;
  reportName:  string;
  category:    CategoryId;
  runBy:       string;
  date:        string;
  format:      OutputFormat;
  status:      RunStatus;
  errorDetail: string | null;
  params:      Record<string, unknown>;
  completesAt: number; // epoch ms when processing → completed
}

export interface ScheduledReport {
  id:         string;
  reportId:   string;
  reportName: string;
  category:   CategoryId;
  frequency:  Frequency;
  nextRun:    string;
  paused:     boolean;
  createdAt:  string;
}

export interface CustomReportDef {
  id:          string;
  name:        string;
  category:    CategoryId;
  metrics:     string[];
  filters:     { dateRange: string; department: string; location: string };
  format:      OutputFormat;
  schedule:    string | null;
  createdAt:   string;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_RUNS: ReportRun[] = [
  {
    id: 'rr1', reportId: 'wf1', reportName: 'Headcount Summary',
    category: 'workforce', runBy: 'John Doe',
    date: 'Mar 20, 2026 — 09:14', format: 'PDF',
    status: 'completed', errorDetail: null,
    params: {}, completesAt: 0,
  },
  {
    id: 'rr2', reportId: 'ta1', reportName: 'Hiring Funnel',
    category: 'talent-acquisition', runBy: 'Sarah Johnson',
    date: 'Mar 18, 2026 — 14:32', format: 'CSV',
    status: 'completed', errorDetail: null,
    params: {}, completesAt: 0,
  },
  {
    id: 'rr3', reportId: 'ld2', reportName: 'Skills Gap Analysis',
    category: 'learning', runBy: 'Priya Patel',
    date: 'Mar 17, 2026 — 11:05', format: 'Excel',
    status: 'completed', errorDetail: null,
    params: {}, completesAt: 0,
  },
  {
    id: 'rr4', reportId: 'cb1', reportName: 'Salary Bands & Benchmarking',
    category: 'compensation', runBy: 'John Doe',
    date: 'Mar 16, 2026 — 16:48', format: 'PDF',
    status: 'processing', errorDetail: null,
    params: {}, completesAt: Date.now() + 9_000,
  },
  {
    id: 'rr5', reportId: 'cb3', reportName: 'Compensation Equity Analysis',
    category: 'compensation', runBy: 'Marcus Chen',
    date: 'Mar 14, 2026 — 10:22', format: 'CSV',
    status: 'failed',
    errorDetail: 'Data source timeout: compensation database returned HTTP 504 after 30s. Try again or contact support.',
    params: {}, completesAt: 0,
  },
];

const SEED_SCHEDULED: ScheduledReport[] = [
  { id: 'sc1', reportId: 'wf1', reportName: 'Headcount Summary',   category: 'workforce',          frequency: 'Monthly',   nextRun: '2026-04-01', paused: false, createdAt: '2026-01-10' },
  { id: 'sc2', reportId: 'ta1', reportName: 'Hiring Funnel',        category: 'talent-acquisition', frequency: 'Weekly',    nextRun: '2026-03-28', paused: false, createdAt: '2026-02-05' },
  { id: 'sc3', reportId: 'pf1', reportName: 'Performance Ratings',  category: 'performance',        frequency: 'Quarterly', nextRun: '2026-06-30', paused: true,  createdAt: '2026-01-15' },
  { id: 'sc4', reportId: 'ld2', reportName: 'Skills Gap Analysis',  category: 'learning',           frequency: 'Monthly',   nextRun: '2026-04-01', paused: false, createdAt: '2026-01-20' },
];

// ─── Sample CSV content by report ────────────────────────────────────────────

function generateContent(run: ReportRun): string {
  const header = `Report: ${run.reportName}\nGenerated: ${new Date().toISOString()}\nFormat: ${run.format}\n\n`;
  const samples: Record<string, string> = {
    wf1: 'Department,Headcount,Change MoM\nEngineering,42,+3\nProduct,18,+1\nDesign,12,0\nAnalytics,9,+2\nHR,7,0\n',
    ta1: 'Stage,Count,Conversion\nApplied,847,100%\nScreened,312,36.8%\nInterview,128,15.1%\nOffer,34,4.0%\nHired,27,3.2%\n',
    ta3: 'Department,Avg Time to Hire,Avg Time to Fill\nEngineering,32 days,48 days\nProduct,28 days,41 days\nDesign,24 days,38 days\nAnalytics,30 days,44 days\n',
    pf1: 'Rating,Count,Percentage\nOutstanding (5),12,14.1%\nExceeds (4),28,32.9%\nMeets (3),31,36.5%\nBelow (2),9,10.6%\nNeeds Improvement (1),5,5.9%\n',
    cb1: 'Role Level,Min,Mid,Max,Market Median\nIC1,$65k,$80k,$95k,$82k\nIC2,$85k,$105k,$125k,$108k\nIC3,$110k,$135k,$160k,$138k\nManager,$130k,$155k,$185k,$160k\n',
    cb3: 'Group,Avg Salary,Market Parity,Gap\nMen,$128k,100%,—\nWomen,$121k,94.5%,−5.5%\nUnderrepresented,$119k,93.0%,−7.0%\n',
    ld2: 'Department,Required Skills,Current Skills,Gap Score\nEngineering,42,38,9.5%\nProduct,28,25,10.7%\nDesign,22,22,0%\nAnalytics,35,29,17.1%\n',
  };
  const body = samples[run.reportId] ?? 'id,name,value\n1,Sample,100\n2,Data,200\n3,Point,150\n';
  return header + body;
}

// ─── Stores ───────────────────────────────────────────────────────────────────

const runs      = new Map<string, ReportRun>(SEED_RUNS.map((r) => [r.id, r]));
const scheduled = new Map<string, ScheduledReport>(SEED_SCHEDULED.map((s) => [s.id, s]));
const customs   = new Map<string, CustomReportDef>();

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' — ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const reportsService = {

  // ── Runs

  getRuns(): ReportRun[] {
    return [...runs.values()].sort((a, b) => b.completesAt - a.completesAt || 0);
  },

  getRunById(id: string): ReportRun | null {
    return runs.get(id) ?? null;
  },

  getRunStatus(id: string): { id: string; status: RunStatus; errorDetail: string | null } | null {
    const run = runs.get(id);
    if (!run) return null;
    // Advance processing → completed when timer fires
    if (run.status === 'processing' && run.completesAt > 0 && Date.now() >= run.completesAt) {
      run.status = 'completed';
    }
    return { id: run.id, status: run.status, errorDetail: run.errorDetail };
  },

  startRun(data: {
    reportId:   string;
    reportName: string;
    category:   CategoryId;
    runBy:      string;
    format:     OutputFormat;
    params?:    Record<string, unknown>;
  }): ReportRun {
    const run: ReportRun = {
      id:          `rr${uid()}`,
      reportId:    data.reportId,
      reportName:  data.reportName,
      category:    data.category,
      runBy:       data.runBy,
      date:        fmtDate(),
      format:      data.format,
      status:      'processing',
      errorDetail: null,
      params:      data.params ?? {},
      completesAt: Date.now() + 6_000,
    };
    runs.set(run.id, run);
    return run;
  },

  getDownload(id: string): { filename: string; content: string; mimeType: string } | null {
    const run = runs.get(id);
    if (!run || run.status !== 'completed') return null;
    const ext      = run.format === 'PDF' ? 'txt' : run.format === 'CSV' ? 'csv' : 'csv';
    const mimeType = run.format === 'CSV' || run.format === 'Excel' ? 'text/csv' : 'text/plain';
    return {
      filename: `${run.reportName.replace(/\s+/g, '-').toLowerCase()}.${ext}`,
      content:  generateContent(run),
      mimeType,
    };
  },

  exportAll(): { filename: string; content: string; mimeType: string } {
    const completed = [...runs.values()].filter((r) => r.status === 'completed');
    const parts = completed.map((r) => `${'='.repeat(60)}\n${generateContent(r)}`);
    return {
      filename: `all-reports-${new Date().toISOString().slice(0, 10)}.txt`,
      content:  parts.join('\n\n'),
      mimeType: 'text/plain',
    };
  },

  // ── Scheduled

  getScheduled(): ScheduledReport[] {
    return [...scheduled.values()];
  },

  updateSchedule(
    id: string,
    data: Partial<Pick<ScheduledReport, 'paused' | 'frequency' | 'nextRun'>>,
  ): ScheduledReport | null {
    const s = scheduled.get(id);
    if (!s) return null;
    Object.assign(s, data);
    return s;
  },

  deleteSchedule(id: string): boolean {
    return scheduled.delete(id);
  },

  createSchedule(data: Omit<ScheduledReport, 'id' | 'createdAt'>): ScheduledReport {
    const s: ScheduledReport = { id: `sc${uid()}`, createdAt: new Date().toISOString().slice(0, 10), ...data };
    scheduled.set(s.id, s);
    return s;
  },

  // ── Custom reports

  createCustomReport(data: Omit<CustomReportDef, 'id' | 'createdAt'>): CustomReportDef {
    const r: CustomReportDef = { id: `cr${uid()}`, createdAt: new Date().toISOString(), ...data };
    customs.set(r.id, r);
    return r;
  },
};
