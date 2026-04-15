import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { CreateRopaEntrySchema, UpdateRopaEntrySchema } from '../types/schemas';
import { createAuditLog, extractRequestMeta, AUDIT_ACTIONS } from '../services/auditService';

export const ropaController = {
  // GET /gdpr/ropa
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const role = req.user?.role;
      if (role !== 'ADMIN' && role !== 'HR') {
        sendError(res, 403, 'FORBIDDEN', 'Admin or HR access required');
        return;
      }

      const entries = await prisma.ropaEntry.findMany({
        orderBy: { createdAt: 'asc' },
      });

      sendSuccess(res, { entries });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch RoPA entries');
    }
  },

  // POST /gdpr/ropa
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        sendError(res, 403, 'FORBIDDEN', 'Admin access required');
        return;
      }

      const parsed = CreateRopaEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 422, 'VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input');
        return;
      }

      const entry = await prisma.ropaEntry.create({ data: parsed.data });

      void createAuditLog({
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: AUDIT_ACTIONS.ROPA_ENTRY_CREATED,
        resourceType: 'ropa_entry',
        resourceId: entry.id,
        metadata: { processingActivity: parsed.data.processingActivity },
        ...extractRequestMeta(req),
      });

      sendSuccess(res, { entry }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create RoPA entry');
    }
  },

  // PATCH /gdpr/ropa/:id
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        sendError(res, 403, 'FORBIDDEN', 'Admin access required');
        return;
      }

      const parsed = UpdateRopaEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 422, 'VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input');
        return;
      }

      const entry = await prisma.ropaEntry.update({
        where: { id: req.params.id },
        data: parsed.data,
      });

      void createAuditLog({
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: AUDIT_ACTIONS.ROPA_ENTRY_UPDATED,
        resourceType: 'ropa_entry',
        resourceId: req.params.id,
        ...extractRequestMeta(req),
      });

      sendSuccess(res, { entry });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update RoPA entry');
    }
  },

  // POST /gdpr/ropa/:id/review
  async markReviewed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const role = req.user?.role;
      if (role !== 'ADMIN' && role !== 'HR') {
        sendError(res, 403, 'FORBIDDEN', 'Admin or HR access required');
        return;
      }

      const entry = await prisma.ropaEntry.update({
        where: { id: req.params.id },
        data: {
          lastReviewedAt: new Date(),
          lastReviewedBy: req.user?.userId ?? null,
        },
      });

      void createAuditLog({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        action: AUDIT_ACTIONS.ROPA_ENTRY_REVIEWED,
        resourceType: 'ropa_entry',
        resourceId: req.params.id,
        ...extractRequestMeta(req),
      });

      sendSuccess(res, { entry });
    } catch {
      sendError(res, 500, 'REVIEW_ERROR', 'Failed to mark entry as reviewed');
    }
  },
};
