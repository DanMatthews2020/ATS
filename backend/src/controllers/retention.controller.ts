import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { runRetentionReview, getRetentionLabel } from '../services/retentionService';

export const retentionController = {
  // POST /gdpr/retention/review — ADMIN only
  async runReview(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        sendError(res, 403, 'FORBIDDEN', 'Admin access required');
        return;
      }
      const summary = await runRetentionReview();
      sendSuccess(res, summary);
    } catch {
      sendError(res, 500, 'REVIEW_ERROR', 'Failed to run retention review');
    }
  },

  // GET /gdpr/retention/candidates — ADMIN or HR
  async getCandidates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const role = req.user?.role;
      if (role !== 'ADMIN' && role !== 'HR') {
        sendError(res, 403, 'FORBIDDEN', 'Admin or HR access required');
        return;
      }

      const candidates = await prisma.candidate.findMany({
        where: {
          retentionStatus: { in: ['EXPIRING_SOON', 'EXPIRED'] },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          retentionStatus: true,
          retentionExpiresAt: true,
          lastActivityAt: true,
          deletedAt: true,
          isAnonymised: true,
        },
        orderBy: [
          { retentionStatus: 'desc' }, // EXPIRED before EXPIRING_SOON
          { retentionExpiresAt: 'asc' },
        ],
      });

      const items = candidates.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        retentionStatus: c.retentionStatus,
        retentionExpiresAt: c.retentionExpiresAt?.toISOString() ?? null,
        lastActivityAt: c.lastActivityAt?.toISOString() ?? null,
        deletedAt: c.deletedAt?.toISOString() ?? null,
        isAnonymised: c.isAnonymised,
        retentionLabel: getRetentionLabel(c),
      }));

      sendSuccess(res, { items });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch retention candidates');
    }
  },
};
