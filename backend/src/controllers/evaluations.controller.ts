import { Response } from 'express';
import { evaluationsService } from '../services/evaluations.service';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export const evaluationsController = {
  async getByCandidate(req: AuthRequest, res: Response) {
    try {
      const evaluations = await evaluationsService.getByCandidate(req.params.candidateId);
      sendSuccess(res, { evaluations });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const evaluation = await evaluationsService.create({
        ...req.body,
        submittedById: req.user!.userId,
      });
      sendSuccess(res, { evaluation }, 201);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'CREATE_ERROR', 'Internal server error');
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const evaluation = await evaluationsService.update(req.params.id, req.body);
      if (!evaluation) return sendError(res, 404, 'NOT_FOUND', 'Evaluation not found');
      sendSuccess(res, { evaluation });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'UPDATE_ERROR', 'Internal server error');
    }
  },
};
