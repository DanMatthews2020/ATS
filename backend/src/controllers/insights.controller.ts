import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { insightsService, type Period } from '../services/insights.service';
import { sendSuccess, sendError } from '../utils/response';

function parsePeriod(raw: unknown): Period {
  if (raw === '30d' || raw === '90d' || raw === '6m' || raw === '12m') return raw;
  return '12m';
}

export const insightsController = {

  getAll(req: AuthRequest, res: Response): void {
    const period = parsePeriod(req.query.period);
    sendSuccess(res, insightsService.getAll(period));
  },

  getStats(req: AuthRequest, res: Response): void {
    const period = parsePeriod(req.query.period);
    sendSuccess(res, insightsService.getStats(period));
  },

  getTrends(req: AuthRequest, res: Response): void {
    const period = parsePeriod(req.query.period);
    sendSuccess(res, { trends: insightsService.getTrends(period) });
  },

  getPipeline(req: AuthRequest, res: Response): void {
    const period = parsePeriod(req.query.period);
    sendSuccess(res, { pipeline: insightsService.getPipeline(period) });
  },

  getSources(req: AuthRequest, res: Response): void {
    const period = parsePeriod(req.query.period);
    sendSuccess(res, { sources: insightsService.getSources(period) });
  },

  getReports(req: AuthRequest, res: Response): void {
    sendSuccess(res, { reports: insightsService.getReports() });
  },

  getReportById(req: AuthRequest, res: Response): void {
    const report = insightsService.getReportById(req.params.id);
    if (!report) { sendError(res, 404, 'NOT_FOUND', 'Report not found'); return; }
    sendSuccess(res, { report });
  },

  deleteReport(req: AuthRequest, res: Response): void {
    const deleted = insightsService.deleteReport(req.params.id);
    if (!deleted) { sendError(res, 404, 'NOT_FOUND', 'Report not found'); return; }
    sendSuccess(res, { deleted: true });
  },

  createReport(req: AuthRequest, res: Response): void {
    const { name, description, type } = req.body as {
      name: string; description?: string; type?: 'Scheduled' | 'Manual';
    };
    if (!name) { sendError(res, 400, 'INVALID_BODY', 'name is required'); return; }
    const today = new Date().toISOString().slice(0, 10);
    const report = insightsService.createReport({
      name,
      description: description ?? '',
      type: type ?? 'Manual',
      createdDate: today,
      lastRun: today,
      data: {},
    });
    sendSuccess(res, { report }, 201);
  },
};
