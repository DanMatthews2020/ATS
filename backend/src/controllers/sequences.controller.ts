/**
 * @file sequences.controller.ts
 * @description HTTP handlers for sequences, steps, and enrollments.
 */
import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { sequencesService } from '../services/sequences.service';
import { sendSuccess, sendError } from '../utils/response';

export const sequencesController = {
  // GET /api/sequences?status=ACTIVE&search=onboarding
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, search } = req.query as { status?: string; search?: string };
      const sequences = await sequencesService.getAll({ status, search });
      sendSuccess(res, { sequences });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch sequences');
    }
  },

  // GET /api/sequences/:id
  async getOne(req: AuthRequest, res: Response): Promise<void> {
    try {
      const sequence = await sequencesService.getById(req.params.id);
      if (!sequence) {
        sendError(res, 404, 'NOT_FOUND', 'Sequence not found');
        return;
      }
      sendSuccess(res, { sequence });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch sequence');
    }
  },

  // POST /api/sequences
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        senderEmail,
        linkedJobId,
        stopOnReply,
        stopOnInterview,
        stopOnHired,
        skipWeekends,
        isShared,
        maxEmails,
        sendingDays,
      } = req.body as {
        name: string;
        senderEmail?: string;
        linkedJobId?: string;
        stopOnReply?: boolean;
        stopOnInterview?: boolean;
        stopOnHired?: boolean;
        skipWeekends?: boolean;
        isShared?: boolean;
        maxEmails?: number;
        sendingDays?: string[];
      };
      if (!name) {
        sendError(res, 400, 'VALIDATION_ERROR', 'name is required');
        return;
      }
      const sequence = await sequencesService.create({
        name,
        senderEmail,
        linkedJobId,
        stopOnReply,
        stopOnInterview,
        stopOnHired,
        skipWeekends,
        isShared,
        maxEmails,
        sendingDays,
        createdById: req.user!.userId,
      });
      sendSuccess(res, { sequence }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create sequence');
    }
  },

  // PATCH /api/sequences/:id
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        status,
        senderEmail,
        linkedJobId,
        stopOnReply,
        stopOnInterview,
        stopOnHired,
        skipWeekends,
        isShared,
        maxEmails,
        sendingDays,
      } = req.body as {
        name?: string;
        status?: 'ACTIVE' | 'PAUSED';
        senderEmail?: string;
        linkedJobId?: string;
        stopOnReply?: boolean;
        stopOnInterview?: boolean;
        stopOnHired?: boolean;
        skipWeekends?: boolean;
        isShared?: boolean;
        maxEmails?: number;
        sendingDays?: string[];
      };
      const sequence = await sequencesService.update(req.params.id, {
        name,
        status,
        senderEmail,
        linkedJobId,
        stopOnReply,
        stopOnInterview,
        stopOnHired,
        skipWeekends,
        isShared,
        maxEmails,
        sendingDays,
      });
      sendSuccess(res, { sequence });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update sequence');
    }
  },

  // DELETE /api/sequences/:id
  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      await sequencesService.delete(req.params.id);
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete sequence');
    }
  },

  // PATCH /api/sequences/:id/status
  async toggleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body as { status: 'ACTIVE' | 'PAUSED' };
      if (!status || !['ACTIVE', 'PAUSED'].includes(status)) {
        sendError(res, 400, 'VALIDATION_ERROR', 'status must be ACTIVE or PAUSED');
        return;
      }
      const sequence = await sequencesService.update(req.params.id, { status });
      sendSuccess(res, { sequence });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to toggle sequence status');
    }
  },

  // POST /api/sequences/:id/steps
  async addStep(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        position,
        type,
        subject,
        body,
        templateId,
        waitDays,
        delayDays,
        taskDescription,
        sendTime,
        sendFrom,
      } = req.body as {
        position: number;
        type: 'EMAIL' | 'WAIT' | 'TASK';
        subject?: string;
        body?: string;
        templateId?: string;
        waitDays?: number;
        delayDays?: number;
        taskDescription?: string;
        sendTime?: string;
        sendFrom?: string;
      };
      if (!type) {
        sendError(res, 400, 'VALIDATION_ERROR', 'type is required');
        return;
      }
      const step = await sequencesService.addStep({
        sequenceId: req.params.id,
        position: position ?? 0,
        type,
        subject,
        body,
        templateId,
        waitDays,
        delayDays,
        taskDescription,
        sendTime,
        sendFrom,
      });
      sendSuccess(res, { step }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to add sequence step');
    }
  },

  // PATCH /api/sequences/:id/steps/:stepId
  async updateStep(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        position,
        type,
        subject,
        body,
        templateId,
        waitDays,
        delayDays,
        taskDescription,
        sendTime,
        sendFrom,
      } = req.body as {
        position?: number;
        type?: 'EMAIL' | 'WAIT' | 'TASK';
        subject?: string;
        body?: string;
        templateId?: string | null;
        waitDays?: number;
        delayDays?: number;
        taskDescription?: string;
        sendTime?: string;
        sendFrom?: string;
      };
      const step = await sequencesService.updateStep(req.params.stepId, {
        position,
        type,
        subject,
        body,
        templateId,
        waitDays,
        delayDays,
        taskDescription,
        sendTime,
        sendFrom,
      });
      sendSuccess(res, { step });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update sequence step');
    }
  },

  // DELETE /api/sequences/:id/steps/:stepId
  async removeStep(req: AuthRequest, res: Response): Promise<void> {
    try {
      await sequencesService.deleteStep(req.params.stepId);
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete sequence step');
    }
  },

  // GET /api/sequences/:id/enrolled?status=ACTIVE
  async getEnrollments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.query as { status?: string };
      const enrollments = await sequencesService.getEnrollments(req.params.id, { status });
      sendSuccess(res, { enrollments });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch enrollments');
    }
  },

  // POST /api/sequences/:id/enroll
  async enroll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { candidateId, sendFrom, startDate } = req.body as {
        candidateId: string;
        sendFrom?: string;
        startDate?: string;
      };
      if (!candidateId) {
        sendError(res, 400, 'VALIDATION_ERROR', 'candidateId is required');
        return;
      }
      const result = await sequencesService.enroll({
        sequenceId: req.params.id,
        candidateId,
        sendFrom,
        startDate,
      });
      if (result.alreadyEnrolled) {
        sendError(res, 409, 'ALREADY_ENROLLED', 'Candidate is already enrolled in this sequence');
        return;
      }
      sendSuccess(res, { enrollment: result.enrollment }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to enroll candidate');
    }
  },

  // DELETE /api/sequences/:id/enroll/:candidateId
  async unenroll(req: AuthRequest, res: Response): Promise<void> {
    try {
      await sequencesService.unenroll(req.params.id, req.params.candidateId);
      sendSuccess(res, { unenrolled: true });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to unenroll candidate');
    }
  },

  // PATCH /api/sequences/:id/enrollments/:enrollmentId/response
  async setResponse(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { response } = req.body as { response: string };
      if (!response) {
        sendError(res, 400, 'VALIDATION_ERROR', 'response is required');
        return;
      }
      const enrollment = await sequencesService.setEnrollmentResponse(
        req.params.enrollmentId,
        response,
      );
      sendSuccess(res, { enrollment });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to set enrollment response');
    }
  },
};
