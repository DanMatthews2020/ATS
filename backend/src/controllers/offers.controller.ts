import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { offersService, type OfferStatus } from '../services/offers.service';
import { sendSuccess, sendError } from '../utils/response';

export const offersController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.query as { status?: OfferStatus };
      const [offers, stats] = await Promise.all([
        offersService.getAll(status),
        offersService.getStats(),
      ]);
      sendSuccess(res, { offers, stats });
    } catch {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to load offers');
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const offer = await offersService.getById(req.params.id);
      if (!offer) { sendError(res, 404, 'NOT_FOUND', 'Offer not found'); return; }
      sendSuccess(res, { offer });
    } catch {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to load offer');
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        applicationId, candidateId, jobId,
        salary, currency,
        startDate, expiryDate,
        equity, benefits, notes,
      } = req.body as {
        applicationId?: string; candidateId?: string; jobId?: string;
        salary: number; currency: string;
        startDate?: string; expiryDate?: string;
        equity?: string; benefits?: string; notes?: string;
      };

      if (!salary || !currency) {
        sendError(res, 400, 'INVALID_BODY', 'salary and currency are required');
        return;
      }
      if (!applicationId && (!candidateId || !jobId)) {
        sendError(res, 400, 'INVALID_BODY', 'Provide applicationId or both candidateId and jobId');
        return;
      }

      const createdBy = req.user?.email ?? 'System';
      const offer = await offersService.create({
        applicationId, candidateId, jobId,
        salary:    Number(salary),
        currency,
        startDate,
        expiryDate,
        equity,
        benefits:  benefits ?? '',
        notes,
        createdBy,
      });
      sendSuccess(res, { offer }, 201);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create offer';
      sendError(res, 500, 'SERVER_ERROR', msg);
    }
  },

  async send(req: AuthRequest, res: Response): Promise<void> {
    try {
      const offer = await offersService.send(req.params.id);
      if (!offer) { sendError(res, 400, 'CANNOT_SEND', 'Offer not found or not in draft status'); return; }
      sendSuccess(res, { offer });
    } catch {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to send offer');
    }
  },

  async updateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status } = req.body as { status: OfferStatus };
      const valid: OfferStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
      if (!valid.includes(status)) {
        sendError(res, 400, 'INVALID_STATUS', `status must be one of: ${valid.join(', ')}`);
        return;
      }
      const offer = await offersService.updateStatus(req.params.id, status);
      sendSuccess(res, { offer });
    } catch {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to update offer status');
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const offer = await offersService.update(req.params.id, req.body);
      sendSuccess(res, { offer });
    } catch {
      sendError(res, 500, 'SERVER_ERROR', 'Failed to update offer');
    }
  },
};
