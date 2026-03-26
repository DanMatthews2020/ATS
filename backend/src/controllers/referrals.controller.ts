import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { referralsService } from '../services/referrals.service';
import { sendSuccess, sendError } from '../utils/response';

export const referralsController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { candidateId, referredByName, referredByEmail, relationship, jobId, jobTitle, note, referralDate } =
        req.body as {
          candidateId: string;
          referredByName: string;
          referredByEmail?: string;
          relationship: string;
          jobId?: string;
          jobTitle?: string;
          note?: string;
          referralDate?: string;
        };
      if (!candidateId || !referredByName || !relationship) {
        sendError(res, 400, 'INVALID_BODY', 'candidateId, referredByName, and relationship are required');
        return;
      }
      const referral = await referralsService.create({
        candidateId,
        referredByName,
        referredByEmail,
        relationship,
        jobId,
        jobTitle,
        note,
        referralDate: referralDate ?? new Date().toISOString(),
      });
      sendSuccess(res, { referral }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create referral');
    }
  },

  async getByCandidateId(req: AuthRequest, res: Response): Promise<void> {
    try {
      const candidateId = req.query.candidateId as string | undefined;
      if (!candidateId) { sendError(res, 400, 'INVALID_QUERY', 'candidateId query param required'); return; }
      const referrals = await referralsService.getByCandidateId(candidateId);
      sendSuccess(res, { referrals });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch referrals');
    }
  },

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ok = await referralsService.delete(req.params.id);
      if (!ok) { sendError(res, 404, 'NOT_FOUND', 'Referral not found'); return; }
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete referral');
    }
  },
};
