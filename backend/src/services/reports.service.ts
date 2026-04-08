/**
 * @file reports.service.ts
 * @description Reports service — run log and schedules backed by Prisma,
 * report content still generated dynamically from existing tables.
 */

import { prisma } from '../lib/prisma';

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
  completesAt: number;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

function fmtDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' — ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtRunDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' — ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Processing runs that have a completion timer */
const processingTimers = new Map<string, number>(); // id → epoch ms when done

function generateContent(reportId: string, reportName: string, format: string): string {
  const header = `Report: ${reportName}\nGenerated: ${new Date().toISOString()}\nFormat: ${format}\n\n`;
  const samples: Record<string, string> = {
    wf1: 'Department,Headcount,Change MoM\nEngineering,42,+3\nProduct,18,+1\nDesign,12,0\nAnalytics,9,+2\nHR,7,0\n',
    ta1: 'Stage,Count,Conversion\nApplied,847,100%\nScreened,312,36.8%\nInterview,128,15.1%\nOffer,34,4.0%\nHired,27,3.2%\n',
    ta3: 'Department,Avg Time to Hire,Avg Time to Fill\nEngineering,32 days,48 days\nProduct,28 days,41 days\nDesign,24 days,38 days\nAnalytics,30 days,44 days\n',
    pf1: 'Rating,Count,Percentage\nOutstanding (5),12,14.1%\nExceeds (4),28,32.9%\nMeets (3),31,36.5%\nBelow (2),9,10.6%\nNeeds Improvement (1),5,5.9%\n',
    cb1: 'Role Level,Min,Mid,Max,Market Median\nIC1,$65k,$80k,$95k,$82k\nIC2,$85k,$105k,$125k,$108k\nIC3,$110k,$135k,$160k,$138k\nManager,$130k,$155k,$185k,$160k\n',
    cb3: 'Group,Avg Salary,Market Parity,Gap\nMen,$128k,100%,—\nWomen,$121k,94.5%,−5.5%\nUnderrepresented,$119k,93.0%,−7.0%\n',
    ld2: 'Department,Required Skills,Current Skills,Gap Score\nEngineering,42,38,9.5%\nProduct,28,25,10.7%\nDesign,22,22,0%\nAnalytics,35,29,17.1%\n',
  };
  const body = samples[reportId] ?? 'id,name,value\n1,Sample,100\n2,Data,200\n3,Point,150\n';
  return header + body;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function runToDto(row: any): ReportRun {
  const completesAt = processingTimers.get(row.id) ?? 0;
  return {
    id:          row.id,
    reportId:    row.reportKey,
    reportName:  row.reportName,
    category:    row.category as CategoryId,
    runBy:       row.runById,
    date:        fmtRunDate(row.runAt),
    format:      row.format as OutputFormat,
    status:      row.status as RunStatus,
    errorDetail: row.fileUrl, // reuse fileUrl to store error details
    params:      {},
    completesAt,
  };
}

// Schedule metadata not in DB (paused, category)
const scheduleMeta = new Map<string, { category: CategoryId; paused: boolean }>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function schedToDto(row: any): ScheduledReport {
  const meta = scheduleMeta.get(row.id) ?? { category: 'workforce' as CategoryId, paused: false };
  return {
    id:         row.id,
    reportId:   row.reportKey,
    reportName: row.reportName,
    category:   meta.category,
    frequency:  row.frequency as Frequency,
    nextRun:    row.nextRunAt.toISOString().slice(0, 10),
    paused:     meta.paused,
    createdAt:  row.createdAt.toISOString().slice(0, 10),
  };
}

// Custom reports store (no DB model)
const customs = new Map<string, CustomReportDef>();

// ─── Service ──────────────────────────────────────────────────────────────────

export const reportsService = {

  // ── Runs

  async getRuns(): Promise<ReportRun[]> {
    const rows = await prisma.reportRun.findMany({
      orderBy: { runAt: 'desc' },
    });
    return rows.map(runToDto);
  },

  async getRunById(id: string): Promise<ReportRun | null> {
    const row = await prisma.reportRun.findUnique({ where: { id } });
    if (!row) return null;
    return runToDto(row);
  },

  async getRunStatus(id: string): Promise<{ id: string; status: RunStatus; errorDetail: string | null } | null> {
    const row = await prisma.reportRun.findUnique({ where: { id } });
    if (!row) return null;

    // Advance processing → completed when timer fires
    let status = row.status as RunStatus;
    const completesAt = processingTimers.get(id) ?? 0;
    if (status === 'processing' && completesAt > 0 && Date.now() >= completesAt) {
      status = 'completed';
      await prisma.reportRun.update({ where: { id }, data: { status: 'completed' } });
      processingTimers.delete(id);
    }

    return { id: row.id, status, errorDetail: row.fileUrl };
  },

  async startRun(data: {
    reportId:   string;
    reportName: string;
    category:   CategoryId;
    runBy:      string;
    format:     OutputFormat;
    params?:    Record<string, unknown>;
  }): Promise<ReportRun> {
    const row = await prisma.reportRun.create({
      data: {
        reportKey:  data.reportId,
        reportName: data.reportName,
        category:   data.category,
        runById:    data.runBy,
        format:     data.format,
        status:     'processing',
      },
    });

    const completesAt = Date.now() + 6_000;
    processingTimers.set(row.id, completesAt);

    return runToDto(row);
  },

  async getDownload(id: string): Promise<{ filename: string; content: string; mimeType: string } | null> {
    const row = await prisma.reportRun.findUnique({ where: { id } });
    if (!row || row.status !== 'completed') return null;
    const ext      = row.format === 'PDF' ? 'txt' : 'csv';
    const mimeType = row.format === 'CSV' || row.format === 'Excel' ? 'text/csv' : 'text/plain';
    return {
      filename: `${row.reportName.replace(/\s+/g, '-').toLowerCase()}.${ext}`,
      content:  generateContent(row.reportKey, row.reportName, row.format),
      mimeType,
    };
  },

  async exportAll(): Promise<{ filename: string; content: string; mimeType: string }> {
    const rows = await prisma.reportRun.findMany({
      where: { status: 'completed' },
      orderBy: { runAt: 'desc' },
    });
    const parts = rows.map((r) => `${'='.repeat(60)}\n${generateContent(r.reportKey, r.reportName, r.format)}`);
    return {
      filename: `all-reports-${new Date().toISOString().slice(0, 10)}.txt`,
      content:  parts.join('\n\n'),
      mimeType: 'text/plain',
    };
  },

  // ── Scheduled

  async getScheduled(): Promise<ScheduledReport[]> {
    const rows = await prisma.reportSchedule.findMany({
      orderBy: { nextRunAt: 'asc' },
    });
    return rows.map(schedToDto);
  },

  async updateSchedule(
    id: string,
    data: Partial<Pick<ScheduledReport, 'paused' | 'frequency' | 'nextRun'>>,
  ): Promise<ScheduledReport | null> {
    const existing = await prisma.reportSchedule.findUnique({ where: { id } });
    if (!existing) return null;

    const patch: Record<string, unknown> = {};
    if (data.frequency !== undefined) patch.frequency = data.frequency;
    if (data.nextRun !== undefined)   patch.nextRunAt = new Date(data.nextRun);

    if (Object.keys(patch).length > 0) {
      await prisma.reportSchedule.update({ where: { id }, data: patch });
    }

    // Update in-memory meta
    if (data.paused !== undefined) {
      const meta = scheduleMeta.get(id) ?? { category: 'workforce' as CategoryId, paused: false };
      meta.paused = data.paused;
      scheduleMeta.set(id, meta);
    }

    const row = await prisma.reportSchedule.findUnique({ where: { id } });
    return row ? schedToDto(row) : null;
  },

  async deleteSchedule(id: string): Promise<boolean> {
    const existing = await prisma.reportSchedule.findUnique({ where: { id } });
    if (!existing) return false;
    await prisma.reportSchedule.delete({ where: { id } });
    scheduleMeta.delete(id);
    return true;
  },

  async createSchedule(data: Omit<ScheduledReport, 'id' | 'createdAt'>): Promise<ScheduledReport> {
    const row = await prisma.reportSchedule.create({
      data: {
        reportKey:  data.reportId,
        reportName: data.reportName,
        frequency:  data.frequency,
        nextRunAt:  new Date(data.nextRun),
      },
    });

    scheduleMeta.set(row.id, { category: data.category, paused: data.paused });

    return schedToDto(row);
  },

  // ── Custom reports (no DB model — in-memory)

  createCustomReport(data: Omit<CustomReportDef, 'id' | 'createdAt'>): CustomReportDef {
    const r: CustomReportDef = { id: `cr${uid()}`, createdAt: new Date().toISOString(), ...data };
    customs.set(r.id, r);
    return r;
  },
};
