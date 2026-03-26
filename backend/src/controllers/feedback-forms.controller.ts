import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { feedbackFormsService } from '../services/feedback-forms.service';
import { sendSuccess, sendError } from '../utils/response';

export const feedbackFormsController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const forms = await feedbackFormsService.getAll();
      sendSuccess(res, { forms });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch feedback forms');
    }
  },

  async getOne(req: AuthRequest, res: Response): Promise<void> {
    try {
      const form = await feedbackFormsService.getById(req.params.id);
      if (!form) {
        sendError(res, 404, 'NOT_FOUND', 'Feedback form not found');
        return;
      }
      sendSuccess(res, { form });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch feedback form');
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, stage, questions } = req.body as {
        name: string;
        stage?: string;
        questions?: unknown;
      };
      const createdById = req.user!.userId;
      const form = await feedbackFormsService.create({ name, stage, questions, createdById });
      sendSuccess(res, { form }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create feedback form');
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, stage, questions } = req.body as {
        name?: string;
        stage?: string;
        questions?: unknown;
      };
      const form = await feedbackFormsService.update(req.params.id, { name, stage, questions });
      sendSuccess(res, { form });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update feedback form');
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      await feedbackFormsService.delete(req.params.id);
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete feedback form');
    }
  },

  async listSubmissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const submissions = await feedbackFormsService.getSubmissions(req.params.id);
      sendSuccess(res, { submissions });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch submissions');
    }
  },

  async createSubmission(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { candidateId, applicationId, answers, overallRating, recommendation } = req.body as {
        candidateId: string;
        applicationId?: string;
        answers: unknown;
        overallRating?: number;
        recommendation?: string;
      };
      const submittedById = req.user!.userId;
      const result = await feedbackFormsService.createSubmission({
        formId: req.params.id,
        candidateId,
        applicationId,
        submittedById,
        answers,
        overallRating,
        recommendation,
      });
      sendSuccess(res, result, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create submission');
    }
  },
};
