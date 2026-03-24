import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { reportsService, type CategoryId, type OutputFormat } from '../services/reports.service';
import { sendSuccess, sendError } from '../utils/response';

export const reportsController = {

  // ── Runs

  getRuns(req: AuthRequest, res: Response): void {
    sendSuccess(res, { runs: reportsService.getRuns() });
  },

  startRun(req: AuthRequest, res: Response): void {
    const { reportId, reportName, category, format, params } = req.body as {
      reportId:   string;
      reportName: string;
      category:   CategoryId;
      format?:    OutputFormat;
      params?:    Record<string, unknown>;
    };
    if (!reportId || !reportName || !category) {
      sendError(res, 400, 'INVALID_BODY', 'reportId, reportName, category are required');
      return;
    }
    const runBy = req.user ? `${req.user.userId}` : 'System';
    const run = reportsService.startRun({
      reportId, reportName, category,
      runBy,
      format: format ?? 'PDF',
      params,
    });
    sendSuccess(res, { run }, 201);
  },

  getRunStatus(req: AuthRequest, res: Response): void {
    const result = reportsService.getRunStatus(req.params.id);
    if (!result) { sendError(res, 404, 'NOT_FOUND', 'Run not found'); return; }
    sendSuccess(res, result);
  },

  downloadRun(req: AuthRequest, res: Response): void {
    const dl = reportsService.getDownload(req.params.id);
    if (!dl) { sendError(res, 404, 'NOT_FOUND', 'Run not found or not completed'); return; }
    res.setHeader('Content-Type', dl.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${dl.filename}"`);
    res.send(dl.content);
  },

  exportAll(req: AuthRequest, res: Response): void {
    const dl = reportsService.exportAll();
    res.setHeader('Content-Type', dl.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${dl.filename}"`);
    res.send(dl.content);
  },

  // ── Scheduled

  getScheduled(req: AuthRequest, res: Response): void {
    sendSuccess(res, { scheduled: reportsService.getScheduled() });
  },

  updateSchedule(req: AuthRequest, res: Response): void {
    const data = req.body as { paused?: boolean; frequency?: string; nextRun?: string };
    const s = reportsService.updateSchedule(req.params.id, data as Parameters<typeof reportsService.updateSchedule>[1]);
    if (!s) { sendError(res, 404, 'NOT_FOUND', 'Scheduled report not found'); return; }
    sendSuccess(res, { schedule: s });
  },

  deleteSchedule(req: AuthRequest, res: Response): void {
    const deleted = reportsService.deleteSchedule(req.params.id);
    if (!deleted) { sendError(res, 404, 'NOT_FOUND', 'Scheduled report not found'); return; }
    sendSuccess(res, { deleted: true });
  },

  createSchedule(req: AuthRequest, res: Response): void {
    const { reportId, reportName, category, frequency, nextRun } = req.body as {
      reportId: string; reportName: string; category: CategoryId;
      frequency: string; nextRun: string;
    };
    if (!reportId || !reportName || !frequency) {
      sendError(res, 400, 'INVALID_BODY', 'reportId, reportName, frequency are required');
      return;
    }
    const s = reportsService.createSchedule({
      reportId, reportName, category: category ?? 'workforce',
      frequency: frequency as Parameters<typeof reportsService.createSchedule>[0]['frequency'],
      nextRun: nextRun ?? new Date().toISOString().slice(0, 10),
      paused: false,
    });
    sendSuccess(res, { schedule: s }, 201);
  },

  // ── Custom reports

  createCustomReport(req: AuthRequest, res: Response): void {
    const { name, category, metrics, filters, format, schedule } = req.body as {
      name:     string;
      category: CategoryId;
      metrics:  string[];
      filters:  { dateRange: string; department: string; location: string };
      format:   OutputFormat;
      schedule: string | null;
    };
    if (!name || !category) {
      sendError(res, 400, 'INVALID_BODY', 'name and category are required');
      return;
    }
    const report = reportsService.createCustomReport({
      name, category,
      metrics:  metrics ?? [],
      filters:  filters ?? { dateRange: '12m', department: '', location: '' },
      format:   format ?? 'PDF',
      schedule: schedule ?? null,
    });

    // Auto-start a run for the new custom report
    const run = reportsService.startRun({
      reportId:   report.id,
      reportName: report.name,
      category:   report.category,
      runBy:      req.user?.userId ?? 'System',
      format:     report.format,
    });

    sendSuccess(res, { report, run }, 201);
  },
};
