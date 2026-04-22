import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const rejectionReasonsController = {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const reasons = await prisma.rejectionReason.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });
      sendSuccess(res, { reasons });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch rejection reasons');
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!['ADMIN', 'HR'].includes(req.user?.role ?? '')) {
        sendError(res, 403, 'FORBIDDEN', 'Only Admins and HR can manage rejection reasons');
        return;
      }

      const { label, description } = req.body as { label: string; description?: string };

      // Duplicate check — case-insensitive among active reasons
      const existing = await prisma.rejectionReason.findFirst({
        where: { label: { equals: label, mode: 'insensitive' }, isActive: true },
      });
      if (existing) {
        sendError(res, 409, 'DUPLICATE_LABEL', 'A rejection reason with this label already exists');
        return;
      }

      const maxSort = await prisma.rejectionReason.aggregate({ _max: { sortOrder: true } });
      const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;

      const reason = await prisma.rejectionReason.create({
        data: {
          label,
          description: description ?? null,
          isDefault: false,
          isActive: true,
          sortOrder,
          createdBy: req.user?.userId ?? null,
        },
      });
      sendSuccess(res, { reason }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create rejection reason');
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!['ADMIN', 'HR'].includes(req.user?.role ?? '')) {
        sendError(res, 403, 'FORBIDDEN', 'Only Admins and HR can manage rejection reasons');
        return;
      }

      const { id } = req.params;
      const body = req.body as { label?: string; description?: string; isActive?: boolean; sortOrder?: number };

      const existing = await prisma.rejectionReason.findUnique({ where: { id } });
      if (!existing) {
        sendError(res, 404, 'NOT_FOUND', 'Rejection reason not found');
        return;
      }

      // Duplicate check if label is changing
      if (body.label && body.label.toLowerCase() !== existing.label.toLowerCase()) {
        const dup = await prisma.rejectionReason.findFirst({
          where: { label: { equals: body.label, mode: 'insensitive' }, isActive: true, id: { not: id } },
        });
        if (dup) {
          sendError(res, 409, 'DUPLICATE_LABEL', 'A rejection reason with this label already exists');
          return;
        }
      }

      // Minimum active reasons guard
      if (body.isActive === false && existing.isActive) {
        const activeCount = await prisma.rejectionReason.count({ where: { isActive: true } });
        if (activeCount <= 3) {
          sendError(res, 422, 'MIN_REASONS', 'At least 3 active rejection reasons are required');
          return;
        }
      }

      const reason = await prisma.rejectionReason.update({
        where: { id },
        data: {
          ...(body.label !== undefined ? { label: body.label } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        },
      });
      sendSuccess(res, { reason });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update rejection reason');
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!['ADMIN', 'HR'].includes(req.user?.role ?? '')) {
        sendError(res, 403, 'FORBIDDEN', 'Only Admins and HR can manage rejection reasons');
        return;
      }

      const { id } = req.params;

      const existing = await prisma.rejectionReason.findUnique({ where: { id } });
      if (!existing) {
        sendError(res, 404, 'NOT_FOUND', 'Rejection reason not found');
        return;
      }

      if (existing.isActive) {
        const activeCount = await prisma.rejectionReason.count({ where: { isActive: true } });
        if (activeCount <= 3) {
          sendError(res, 422, 'MIN_REASONS', 'At least 3 active rejection reasons are required');
          return;
        }
      }

      await prisma.rejectionReason.update({ where: { id }, data: { isActive: false } });
      sendSuccess(res, { id });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to remove rejection reason');
    }
  },
};
