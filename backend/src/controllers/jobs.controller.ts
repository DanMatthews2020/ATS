import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { jobsService } from '../services/jobs.service';
import { sendSuccess, sendError } from '../utils/response';

export const jobsController = {
  async getPipelineStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await jobsService.getPipelineStats();
      sendSuccess(res, { stats });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch pipeline stats');
    }
  },

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await jobsService.getStats();
      sendSuccess(res, stats);
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch job stats');
    }
  },

  async getJobs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
      const result = await jobsService.getJobs(page, limit);
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch job postings');
    }
  },

  async getJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const job = await jobsService.getJobById(req.params.id);
      if (!job) {
        sendError(res, 404, 'NOT_FOUND', 'Job posting not found');
        return;
      }
      sendSuccess(res, { job });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch job posting');
    }
  },

  async createJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }
      const job = await jobsService.createJob({ ...req.body as Record<string, unknown>, createdById: userId } as Parameters<typeof jobsService.createJob>[0]);
      sendSuccess(res, { job }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create job posting');
    }
  },

  async getJobApplications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const applications = await jobsService.getJobApplications(req.params.id);
      sendSuccess(res, { applications });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch applications');
    }
  },

  async updateJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body as { status?: string };
      if (!status) {
        sendError(res, 400, 'INVALID_BODY', 'status is required');
        return;
      }
      const job = await jobsService.updateJobStatus(req.params.id, status);
      if (!job) {
        sendError(res, 404, 'NOT_FOUND', 'Job posting not found');
        return;
      }
      sendSuccess(res, { job });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update job posting');
    }
  },
};
