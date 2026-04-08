import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { reportsService, type CategoryId, type OutputFormat } from '../services/reports.service';
import { sendSuccess, sendError } from '../utils/response';

export const reportsController = {

  // ── Runs

  async getRuns(req: AuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, { runs: await reportsService.getRuns() });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async startRun(req: AuthRequest, res: Response): Promise<void> {
    try {
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
      const run = await reportsService.startRun({
        reportId, reportName, category,
        runBy,
        format: format ?? 'PDF',
        params,
      });
      sendSuccess(res, { run }, 201);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'CREATE_ERROR', 'Internal server error');
    }
  },

  async getRunStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await reportsService.getRunStatus(req.params.id);
      if (!result) { sendError(res, 404, 'NOT_FOUND', 'Run not found'); return; }
      sendSuccess(res, result);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async downloadRun(req: AuthRequest, res: Response): Promise<void> {
    try {
      const dl = await reportsService.getDownload(req.params.id);
      if (!dl) { sendError(res, 404, 'NOT_FOUND', 'Run not found or not completed'); return; }
      res.setHeader('Content-Type', dl.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${dl.filename}"`);
      res.send(dl.content);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async exportAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const dl = await reportsService.exportAll();
      res.setHeader('Content-Type', dl.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${dl.filename}"`);
      res.send(dl.content);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'EXPORT_ERROR', 'Internal server error');
    }
  },

  // ── Scheduled

  async getScheduled(req: AuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, { scheduled: await reportsService.getScheduled() });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async updateSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = req.body as { paused?: boolean; frequency?: string; nextRun?: string };
      const s = await reportsService.updateSchedule(req.params.id, data as Parameters<typeof reportsService.updateSchedule>[1]);
      if (!s) { sendError(res, 404, 'NOT_FOUND', 'Scheduled report not found'); return; }
      sendSuccess(res, { schedule: s });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'UPDATE_ERROR', 'Internal server error');
    }
  },

  async deleteSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const deleted = await reportsService.deleteSchedule(req.params.id);
      if (!deleted) { sendError(res, 404, 'NOT_FOUND', 'Scheduled report not found'); return; }
      sendSuccess(res, { deleted: true });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'DELETE_ERROR', 'Internal server error');
    }
  },

  async createSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { reportId, reportName, category, frequency, nextRun } = req.body as {
        reportId: string; reportName: string; category: CategoryId;
        frequency: string; nextRun: string;
      };
      if (!reportId || !reportName || !frequency) {
        sendError(res, 400, 'INVALID_BODY', 'reportId, reportName, frequency are required');
        return;
      }
      const s = await reportsService.createSchedule({
        reportId, reportName, category: category ?? 'workforce',
        frequency: frequency as Parameters<typeof reportsService.createSchedule>[0]['frequency'],
        nextRun: nextRun ?? new Date().toISOString().slice(0, 10),
        paused: false,
      });
      sendSuccess(res, { schedule: s }, 201);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'CREATE_ERROR', 'Internal server error');
    }
  },

  // ── Custom reports

  async createCustomReport(req: AuthRequest, res: Response): Promise<void> {
    try {
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

      const run = await reportsService.startRun({
        reportId:   report.id,
        reportName: report.name,
        category:   report.category,
        runBy:      req.user?.userId ?? 'System',
        format:     report.format,
      });

      sendSuccess(res, { report, run }, 201);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'CREATE_ERROR', 'Internal server error');
    }
  },
};
