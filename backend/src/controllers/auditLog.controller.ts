import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const auditLogController = {
  // GET /gdpr/audit-logs — ADMIN/HR only
  async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const role = req.user?.role;
      if (role !== 'ADMIN' && role !== 'HR') {
        sendError(res, 403, 'FORBIDDEN', 'Admin or HR access required');
        return;
      }

      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
      const skip = (page - 1) * limit;

      const action = (req.query.action as string | undefined) || undefined;
      const resourceType = (req.query.resourceType as string | undefined) || undefined;
      const actorId = (req.query.actorId as string | undefined) || undefined;
      const from = req.query.from ? new Date(req.query.from as string) : undefined;
      const to = req.query.to ? new Date(req.query.to as string) : undefined;

      const where: Record<string, unknown> = {};
      if (action) where.action = action;
      if (resourceType) where.resourceType = resourceType;
      if (actorId) where.actorId = actorId;
      if (from || to) {
        where.createdAt = {
          ...(from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        };
      }

      const [items, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      sendSuccess(res, { items, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch audit logs');
    }
  },

  // GET /gdpr/audit-logs/candidate/:candidateId — any authenticated user, last 20
  async getCandidateAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const items = await prisma.auditLog.findMany({
        where: {
          resourceType: 'candidate',
          resourceId: req.params.candidateId,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      sendSuccess(res, { items });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch candidate audit logs');
    }
  },
};
