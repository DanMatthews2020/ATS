import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { insightsService, type Period } from '../services/insights.service';
import { sendSuccess, sendError } from '../utils/response';

function parsePeriod(raw: unknown): Period {
  if (raw === '30d' || raw === '90d' || raw === '6m' || raw === '12m') return raw;
  return '12m';
}

export const insightsController = {

  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const period = parsePeriod(req.query.period);
      sendSuccess(res, await insightsService.getAll(period));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const period = parsePeriod(req.query.period);
      sendSuccess(res, await insightsService.getStats(period));
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getTrends(req: AuthRequest, res: Response): Promise<void> {
    try {
      const period = parsePeriod(req.query.period);
      sendSuccess(res, { trends: await insightsService.getTrends(period) });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getPipeline(req: AuthRequest, res: Response): Promise<void> {
    try {
      const period = parsePeriod(req.query.period);
      sendSuccess(res, { pipeline: await insightsService.getPipeline(period) });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getSources(req: AuthRequest, res: Response): Promise<void> {
    try {
      const period = parsePeriod(req.query.period);
      sendSuccess(res, { sources: await insightsService.getSources(period) });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  getReports(_req: AuthRequest, res: Response): void {
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
