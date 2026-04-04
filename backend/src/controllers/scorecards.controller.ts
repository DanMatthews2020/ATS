import { Response } from 'express';
import { scorecardsService } from '../services/scorecards.service';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export const scorecardsController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const scorecards = await scorecardsService.getAll();
      sendSuccess(res, { scorecards });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const sc = await scorecardsService.getById(req.params.id);
      if (!sc) return sendError(res, 404, 'NOT_FOUND', 'Scorecard not found');
      sendSuccess(res, sc);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const sc = await scorecardsService.create({
        ...req.body,
        createdById: req.user!.userId,
      });
      sendSuccess(res, sc, 201);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'CREATE_ERROR', 'Internal server error');
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const sc = await scorecardsService.update(req.params.id, req.body);
      if (!sc) return sendError(res, 404, 'NOT_FOUND', 'Scorecard not found');
      sendSuccess(res, sc);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'UPDATE_ERROR', 'Internal server error');
    }
  },

  async delete_(req: AuthRequest, res: Response) {
    try {
      const ok = await scorecardsService.delete(req.params.id);
      if (!ok) return sendError(res, 404, 'NOT_FOUND', 'Scorecard not found');
      sendSuccess(res, { deleted: true });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'DELETE_ERROR', 'Internal server error');
    }
  },
};
