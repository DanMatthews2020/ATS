import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { applicationsService } from '../services/applications.service';
import { sendSuccess, sendError } from '../utils/response';
import type { ApplicationStatus } from '@prisma/client';
import { createAuditLog, extractRequestMeta, AUDIT_ACTIONS } from '../services/auditService';
import { prisma } from '../lib/prisma';

export const applicationsController = {
  async updateStage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body as { status: ApplicationStatus };
      // Guard: reject must use the dedicated endpoint
      if (status === 'REJECTED') {
        sendError(res, 400, 'USE_REJECT_ENDPOINT', 'Use PATCH /api/applications/:id/reject to reject a candidate');
        return;
      }
      const result = await applicationsService.updateStage(req.params.id, status);
      if (!result) {
        sendError(res, 404, 'NOT_FOUND', 'Application not found');
        return;
      }
      // Update lastActivityAt on the candidate
      const app = await prisma.application.findUnique({ where: { id: req.params.id }, select: { candidateId: true } });
      if (app) void prisma.candidate.update({ where: { id: app.candidateId }, data: { lastActivityAt: new Date() } }).catch(() => {});
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

  async rejectApplication(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reasonId, reasonLabel, note } = req.body as {
        reasonId?: string;
        reasonLabel: string;
        note?: string;
      };

      // 1. Fetch application with candidate and rejection
      const application = await prisma.application.findUnique({
        where: { id },
        include: { candidate: true, rejection: true },
      });

      if (!application) {
        sendError(res, 404, 'NOT_FOUND', 'Application not found');
        return;
      }

      // 2. Check if already rejected
      if (application.rejection) {
        sendError(res, 409, 'ALREADY_REJECTED', 'This application has already been rejected');
        return;
      }

      // 3. Validate rejection reason if provided
      if (reasonId) {
        const reason = await prisma.rejectionReason.findUnique({ where: { id: reasonId } });
        if (!reason || !reason.isActive) {
          sendError(res, 422, 'INVALID_REASON', 'Rejection reason not found or has been disabled');
          return;
        }
      }

      // 4. Run in a transaction — capture current stage before updating to REJECTED
      const stageAtRejection = application.status;
      const [updatedApp, createdRejection] = await prisma.$transaction(async (tx) => {
        const rejection = await tx.applicationRejection.create({
          data: {
            applicationId: id,
            reasonId: reasonId ?? null,
            reasonLabel,
            note: note ?? null,
            rejectedBy: req.user?.userId ?? 'unknown',
            stageAtRejection,
          },
        });

        // Candidate has no status field — status is derived from application status
        const app = await tx.application.update({
          where: { id },
          data: { status: 'REJECTED' },
        });

        return [app, rejection] as const;
      });

      // 5. Fire-and-forget audit log
      void createAuditLog({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        action: AUDIT_ACTIONS.STAGE_CHANGED,
        resourceType: 'application',
        resourceId: id,
        metadata: { newStatus: 'REJECTED', reasonLabel, note },
        ...extractRequestMeta(req),
      });

      sendSuccess(res, { application: { ...updatedApp, rejection: createdRejection } });
    } catch {
      sendError(res, 500, 'REJECT_ERROR', 'Failed to reject application');
    }
  },
};
