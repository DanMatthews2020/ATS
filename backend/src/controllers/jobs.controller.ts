import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { jobsService } from '../services/jobs.service';
import { workflowsService } from '../services/workflows.service';
import { jobMembersService } from '../services/jobMembers.service';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';

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
      const status = req.query.status as string | undefined;
      const result = await jobsService.getJobs(page, limit, status);
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
      const { status } = req.query as { status?: string };
      const applications = await jobsService.getJobApplications(req.params.id, status);
      sendSuccess(res, { applications });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch applications');
    }
  },

  async getJobCandidates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { stage } = req.query as { stage?: string };
      const candidates = await jobsService.getJobCandidates(req.params.id, stage);
      sendSuccess(res, { candidates });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch candidates');
    }
  },

  async getJobPipelineStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const stats = await jobsService.getJobPipelineStats(req.params.id);
      sendSuccess(res, { stats });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch pipeline stats');
    }
  },

  async deleteJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ok = await jobsService.deleteJob(req.params.id);
      if (!ok) {
        sendError(res, 404, 'NOT_FOUND', 'Job posting not found');
        return;
      }
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete job posting');
    }
  },

  async getJobMembers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const members = await jobMembersService.getByJobId(req.params.id);
      sendSuccess(res, { members });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch job members');
    }
  },

  async addJobMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, role } = req.body as { userId?: string; role?: string };
      if (!userId) { sendError(res, 400, 'INVALID_BODY', 'userId is required'); return; }
      const member = await jobMembersService.add(req.params.id, userId, role ?? 'HIRING_MANAGER');
      sendSuccess(res, { member }, 201);
    } catch (err: unknown) {
      const msg = (err as { code?: string })?.code === 'P2002'
        ? 'This user is already a member of this job'
        : (err as { code?: string })?.code === 'P2025'
        ? 'User not found'
        : 'Failed to add job member';
      const status = (err as { code?: string })?.code === 'P2002' ? 409 : 500;
      sendError(res, status, 'ADD_MEMBER_ERROR', msg);
    }
  },

  async removeJobMember(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ok = await jobMembersService.remove(req.params.memberId);
      if (!ok) { sendError(res, 404, 'NOT_FOUND', 'Member not found'); return; }
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to remove job member');
    }
  },

  async getJobStages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const workflow = await workflowsService.getByJobId(req.params.id);
      sendSuccess(res, { stages: workflow?.stages ?? [] });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch workflow stages');
    }
  },

  async saveJobStages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }
      const { stages } = req.body as { stages: Array<{ stageName: string; stageType: string; description?: string }> };
      if (!Array.isArray(stages) || stages.length === 0) {
        sendError(res, 400, 'INVALID_BODY', 'stages array is required'); return;
      }
      const workflow = await workflowsService.saveStagesForJob(req.params.id, userId, stages);
      sendSuccess(res, { stages: workflow.stages });
    } catch {
      sendError(res, 500, 'SAVE_ERROR', 'Failed to save workflow stages');
    }
  },

  async updateStageScorecard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { stageId } = req.params;
      const { scorecardId } = req.body as { scorecardId: string | null };
      const stage = await workflowsService.updateStage(stageId, {
        scorecardId: scorecardId ?? null,
        requiresScorecard: !!scorecardId,
      });
      sendSuccess(res, { stage });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update stage scorecard');
    }
  },

  async getArchivedApplications(req: AuthRequest, res: Response): Promise<void> {
    try {
      const jobId = req.params.id;
      // Query by application.status (source of truth for rejection state).
      // Use updatedAt for ordering instead of rejection.rejectedAt to avoid
      // Prisma optional-relation orderBy issues with applications that have
      // no ApplicationRejection record (e.g. legacy seed data).
      const applications = await prisma.application.findMany({
        where: { jobPostingId: jobId, status: 'REJECTED' },
        include: {
          candidate: { select: { id: true, firstName: true, lastName: true, email: true, currentCompany: true } },
          rejection: { select: { reasonLabel: true, note: true, rejectedAt: true, rejectedBy: true, stageAtRejection: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const archivedCandidates = applications.map((app) => ({
        applicationId: app.id,
        candidateId: app.candidate.id,
        candidateName: `${app.candidate.firstName} ${app.candidate.lastName}`,
        candidateEmail: app.candidate.email ?? null,
        currentCompany: app.candidate.currentCompany ?? null,
        stageAtRejection: app.rejection?.stageAtRejection ?? null,
        rejectionReason: app.rejection?.reasonLabel ?? 'Unknown',
        rejectionNote: app.rejection?.note ?? null,
        rejectedAt: app.rejection?.rejectedAt?.toISOString() ?? app.updatedAt.toISOString(),
      }));

      sendSuccess(res, { archivedCandidates, total: archivedCandidates.length, jobId });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch archived applications');
    }
  },

  async updateJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const body = req.body as {
        status?: string;
        title?: string;
        department?: string;
        location?: string;
        type?: string;
        description?: string;
        requirements?: string;
        salaryMin?: number | null;
        salaryMax?: number | null;
      };
      // If only status is provided, use the status-specific path (handles openedAt/closedAt)
      if (Object.keys(body).length === 1 && body.status) {
        const job = await jobsService.updateJobStatus(req.params.id, body.status);
        if (!job) { sendError(res, 404, 'NOT_FOUND', 'Job posting not found'); return; }
        sendSuccess(res, { job });
        return;
      }
      const job = await jobsService.updateJob(req.params.id, body);
      if (!job) { sendError(res, 404, 'NOT_FOUND', 'Job posting not found'); return; }
      sendSuccess(res, { job });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update job posting');
    }
  },
};
