import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { applicationsService } from '../services/applications.service';
import { sendSuccess, sendError } from '../utils/response';
import type { ApplicationStatus } from '@prisma/client';
import { createAuditLog, extractRequestMeta, AUDIT_ACTIONS } from '../services/auditService';

export const applicationsController = {
  async updateStage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body as { status: ApplicationStatus };
      const result = await applicationsService.updateStage(req.params.id, status);
      if (!result) {
        sendError(res, 404, 'NOT_FOUND', 'Application not found');
        return;
      }
      void createAuditLog({ actorId: req.user?.userId, actorEmail: req.user?.email, actorRole: req.user?.role, action: AUDIT_ACTIONS.STAGE_CHANGED, resourceType: 'application', resourceId: req.params.id, metadata: { newStatus: status }, ...extractRequestMeta(req) });
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update application stage');
    }
  },

  async createApplication(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { candidateId, jobPostingId, status } = req.body as {
        candidateId: string;
        jobPostingId: string;
        status?: string;
      };
      const result = await applicationsService.createApplication(
        candidateId,
        jobPostingId,
        status ?? 'APPLIED',
      );
      if (!result) {
        sendError(res, 409, 'ALREADY_EXISTS', 'Candidate has already applied to this job');
        return;
      }
      sendSuccess(res, { application: result }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create application');
    }
  },

  async updateSubStage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { stage } = req.body as { stage?: string | null };
      const result = await applicationsService.updateSubStage(req.params.id, stage ?? null);
      if (!result) {
        sendError(res, 404, 'NOT_FOUND', 'Application not found');
        return;
      }
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update sub-stage');
    }
  },

  async updateNotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { notes } = req.body as { notes: string };
      if (typeof notes !== 'string') {
        sendError(res, 400, 'INVALID_BODY', 'notes must be a string');
        return;
      }
      const result = await applicationsService.updateNotes(req.params.id, notes);
      if (!result) {
        sendError(res, 404, 'NOT_FOUND', 'Application not found');
        return;
      }
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update notes');
    }
  },
};
