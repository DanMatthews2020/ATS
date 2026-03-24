import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { offersService, type OfferStatus } from '../services/offers.service';
import { sendSuccess, sendError } from '../utils/response';

export const offersController = {
  getAll(req: AuthRequest, res: Response): void {
    const { status } = req.query as { status?: OfferStatus };
    sendSuccess(res, { offers: offersService.getAll(status), stats: offersService.getStats() });
  },

  getById(req: AuthRequest, res: Response): void {
    const offer = offersService.getById(req.params.id);
    if (!offer) { sendError(res, 404, 'NOT_FOUND', 'Offer not found'); return; }
    sendSuccess(res, { offer });
  },

  create(req: AuthRequest, res: Response): void {
    const { candidateId, candidateName, jobId, jobTitle, department, salary, currency, startDate, expiryDate, equity, benefits, notes } = req.body as {
      candidateId: string; candidateName: string;
      jobId: string; jobTitle: string; department: string;
      salary: number; currency: string;
      startDate: string; expiryDate: string;
      equity?: string; benefits: string; notes?: string;
    };
    if (!candidateId || !candidateName || !jobId || !salary || !startDate || !expiryDate) {
      sendError(res, 400, 'INVALID_BODY', 'candidateId, candidateName, jobId, salary, startDate, expiryDate are required');
      return;
    }
    const createdBy = req.user ? req.user.email : 'System';
    const offer = offersService.create({
      candidateId, candidateName, jobId, jobTitle: jobTitle ?? '', department: department ?? '',
      salary: Number(salary), currency: currency ?? 'GBP',
      startDate, expiryDate, equity, benefits: benefits ?? '', notes,
      createdBy,
    });
    sendSuccess(res, { offer }, 201);
  },

  send(req: AuthRequest, res: Response): void {
    const offer = offersService.send(req.params.id);
    if (!offer) { sendError(res, 400, 'CANNOT_SEND', 'Offer not found or is not in draft status'); return; }
    sendSuccess(res, { offer });
  },

  updateStatus(req: AuthRequest, res: Response): void {
    const { status } = req.body as { status: OfferStatus };
    const valid: OfferStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
    if (!valid.includes(status)) {
      sendError(res, 400, 'INVALID_STATUS', `status must be one of: ${valid.join(', ')}`);
      return;
    }
    const offer = offersService.updateStatus(req.params.id, status);
    if (!offer) { sendError(res, 404, 'NOT_FOUND', 'Offer not found'); return; }
    sendSuccess(res, { offer });
  },

  update(req: AuthRequest, res: Response): void {
    const offer = offersService.update(req.params.id, req.body);
    if (!offer) { sendError(res, 404, 'NOT_FOUND', 'Offer not found'); return; }
    sendSuccess(res, { offer });
  },
};
