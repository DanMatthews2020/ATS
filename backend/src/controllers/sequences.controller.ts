import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { sequencesService } from '../services/sequences.service';
import { sendSuccess, sendError } from '../utils/response';

export const sequencesController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const sequences = await sequencesService.getAll(req.user!.userId);
      sendSuccess(res, { sequences });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch sequences');
    }
  },

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

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, stopOnReply, stopOnInterview, maxEmails, sendingDays } = req.body as {
        name: string;
        stopOnReply?: boolean;
        stopOnInterview?: boolean;
        maxEmails?: number;
        sendingDays?: string[];
      };
      const createdById = req.user!.userId;
      const sequence = await sequencesService.create({ name, stopOnReply, stopOnInterview, maxEmails, sendingDays, createdById });
      sendSuccess(res, { sequence }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create sequence');
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, status, stopOnReply, stopOnInterview, maxEmails, sendingDays } = req.body as {
        name?: string;
        status?: 'ACTIVE' | 'PAUSED';
        stopOnReply?: boolean;
        stopOnInterview?: boolean;
        maxEmails?: number;
        sendingDays?: string[];
      };
      const sequence = await sequencesService.update(req.params.id, { name, status, stopOnReply, stopOnInterview, maxEmails, sendingDays });
      sendSuccess(res, { sequence });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update sequence');
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      await sequencesService.delete(req.params.id);
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete sequence');
    }
  },

  async toggleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body as { status: 'ACTIVE' | 'PAUSED' };
      const sequence = await sequencesService.update(req.params.id, { status });
      sendSuccess(res, { sequence });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to toggle sequence status');
    }
  },

  async addStep(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { position, type, templateId, waitDays, taskDescription, sendTime } = req.body as {
        position: number;
        type: 'EMAIL' | 'WAIT' | 'TASK';
        templateId?: string;
        waitDays?: number;
        taskDescription?: string;
        sendTime?: string;
      };
      const step = await sequencesService.addStep({ sequenceId: req.params.id, position, type, templateId, waitDays, taskDescription, sendTime });
      sendSuccess(res, { step }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to add sequence step');
    }
  },

  async updateStep(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { position, type, templateId, waitDays, taskDescription, sendTime } = req.body as {
        position?: number;
        type?: 'EMAIL' | 'WAIT' | 'TASK';
        templateId?: string | null;
        waitDays?: number;
        taskDescription?: string;
        sendTime?: string;
      };
      const step = await sequencesService.updateStep(req.params.stepId, { position, type, templateId, waitDays, taskDescription, sendTime });
      sendSuccess(res, { step });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update sequence step');
    }
  },

  async removeStep(req: AuthRequest, res: Response): Promise<void> {
    try {
      await sequencesService.deleteStep(req.params.stepId);
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete sequence step');
    }
  },

  async getEnrollments(req: AuthRequest, res: Response): Promise<void> {
    try {
      const enrollments = await sequencesService.getEnrollments(req.params.id);
      sendSuccess(res, { enrollments });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch enrollments');
    }
  },

  async enroll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { candidateId } = req.body as { candidateId: string };
      const result = await sequencesService.enroll({ sequenceId: req.params.id, candidateId });
      sendSuccess(res, result, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to enroll candidate');
    }
  },

  async unenroll(req: AuthRequest, res: Response): Promise<void> {
    try {
      await sequencesService.unenroll(req.params.id, req.params.candidateId);
      sendSuccess(res, { unenrolled: true });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to unenroll candidate');
    }
  },
};
