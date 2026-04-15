import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { CreateRightsRequestSchema, UpdateRightsRequestSchema } from '../types/schemas';
import { createAuditLog, extractRequestMeta, AUDIT_ACTIONS } from '../services/auditService';
import { generateCandidateExport } from '../services/exportService';
import { candidatesService } from '../services/candidates.service';

export const rightsRequestsController = {
  // GET /gdpr/rights-requests
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const role = req.user?.role;
      if (role !== 'ADMIN' && role !== 'HR') {
        sendError(res, 403, 'FORBIDDEN', 'Admin or HR access required');
        return;
      }

      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
      const skip = (page - 1) * limit;

      const status = (req.query.status as string | undefined) || undefined;
      const requestType = (req.query.requestType as string | undefined) || undefined;

      const where: Record<string, unknown> = {};
      if (status) where.status = status;
      if (requestType) where.requestType = requestType;

      const [items, total] = await Promise.all([
        prisma.candidateRightsRequest.findMany({
          where,
          orderBy: { dueAt: 'asc' },
          skip,
          take: limit,
          include: {
            candidate: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        }),
        prisma.candidateRightsRequest.count({ where }),
      ]);

      const mapped = items.map((r) => ({
        id: r.id,
        candidateId: r.candidateId,
        candidateName: r.candidate ? `${r.candidate.firstName} ${r.candidate.lastName}` : null,
        candidateEmail: r.candidate?.email ?? null,
        requesterEmail: r.requesterEmail,
        requestType: r.requestType,
        status: r.status,
        receivedAt: r.receivedAt.toISOString(),
        dueAt: r.dueAt.toISOString(),
        fulfilledAt: r.fulfilledAt?.toISOString() ?? null,
        fulfilledBy: r.fulfilledBy,
        notes: r.notes,
        rejectionReason: r.rejectionReason,
        createdAt: r.createdAt.toISOString(),
      }));

      sendSuccess(res, { items: mapped, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch rights requests');
    }
  },

  // POST /gdpr/rights-requests
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const role = req.user?.role;
      if (role !== 'ADMIN' && role !== 'HR') {
        sendError(res, 403, 'FORBIDDEN', 'Admin or HR access required');
        return;
      }

      const parsed = CreateRightsRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 422, 'VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input');
        return;
      }

      const data = parsed.data;
      const receivedAt = new Date(data.receivedAt);
      const dueAt = new Date(receivedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

      const request = await prisma.candidateRightsRequest.create({
        data: {
          requesterEmail: data.requesterEmail,
          requestType: data.requestType,
          receivedAt,
          dueAt,
          candidateId: data.candidateId || null,
          notes: data.notes || null,
        },
      });

      void createAuditLog({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        action: AUDIT_ACTIONS.RIGHTS_REQUEST_CREATED,
        resourceType: 'rights_request',
        resourceId: request.id,
        metadata: { requestType: data.requestType, requesterEmail: data.requesterEmail },
        ...extractRequestMeta(req),
      });

      sendSuccess(res, { request: { ...request, receivedAt: request.receivedAt.toISOString(), dueAt: request.dueAt.toISOString(), createdAt: request.createdAt.toISOString(), updatedAt: request.updatedAt.toISOString(), fulfilledAt: null } }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create rights request');
    }
  },

  // PATCH /gdpr/rights-requests/:id
  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const role = req.user?.role;
      if (role !== 'ADMIN' && role !== 'HR') {
        sendError(res, 403, 'FORBIDDEN', 'Admin or HR access required');
        return;
      }

      const parsed = UpdateRightsRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 422, 'VALIDATION_ERROR', parsed.error.errors[0]?.message ?? 'Invalid input');
        return;
      }

      const data = parsed.data;
      const updateData: Record<string, unknown> = {};
      if (data.status) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;

      if (data.status === 'FULFILLED') {
        updateData.fulfilledAt = new Date();
        updateData.fulfilledBy = req.user?.userId ?? null;
      }

      const updated = await prisma.candidateRightsRequest.update({
        where: { id: req.params.id },
        data: updateData,
      });

      if (data.status === 'FULFILLED') {
        void createAuditLog({
          actorId: req.user?.userId,
          actorEmail: req.user?.email,
          actorRole: req.user?.role,
          action: AUDIT_ACTIONS.RIGHTS_REQUEST_FULFILLED,
          resourceType: 'rights_request',
          resourceId: req.params.id,
          ...extractRequestMeta(req),
        });
      }

      sendSuccess(res, { request: { ...updated, receivedAt: updated.receivedAt.toISOString(), dueAt: updated.dueAt.toISOString(), createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), fulfilledAt: updated.fulfilledAt?.toISOString() ?? null } });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update rights request');
    }
  },

  // GET /gdpr/rights-requests/:id/export
  async downloadExport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const role = req.user?.role;
      if (role !== 'ADMIN' && role !== 'HR') {
        sendError(res, 403, 'FORBIDDEN', 'Admin or HR access required');
        return;
      }

      const request = await prisma.candidateRightsRequest.findUnique({ where: { id: req.params.id } });
      if (!request) { sendError(res, 404, 'NOT_FOUND', 'Request not found'); return; }
      if (!['SAR', 'PORTABILITY'].includes(request.requestType)) {
        sendError(res, 400, 'INVALID_TYPE', 'Export is only available for SAR and PORTABILITY requests');
        return;
      }
      if (!request.candidateId) {
        sendError(res, 400, 'NO_CANDIDATE', 'No candidate linked to this request');
        return;
      }

      const exportData = await generateCandidateExport(request.candidateId);

      void createAuditLog({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        action: AUDIT_ACTIONS.RIGHTS_REQUEST_EXPORT,
        resourceType: 'rights_request',
        resourceId: req.params.id,
        ...extractRequestMeta(req),
      });

      res.setHeader('Content-Disposition', `attachment; filename="candidate-export-${request.candidateId.slice(-6)}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(exportData, null, 2));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('not found')) {
        sendError(res, 404, 'NOT_FOUND', 'Candidate not found');
      } else {
        sendError(res, 500, 'EXPORT_ERROR', 'Failed to generate export');
      }
    }
  },

  // POST /gdpr/rights-requests/:id/fulfil-erasure
  async fulfilErasure(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        sendError(res, 403, 'FORBIDDEN', 'Admin access required');
        return;
      }

      const request = await prisma.candidateRightsRequest.findUnique({ where: { id: req.params.id } });
      if (!request) { sendError(res, 404, 'NOT_FOUND', 'Request not found'); return; }
      if (request.requestType !== 'ERASURE') {
        sendError(res, 400, 'INVALID_TYPE', 'This request is not an erasure request');
        return;
      }
      if (!['OPEN', 'IN_PROGRESS'].includes(request.status)) {
        sendError(res, 400, 'INVALID_STATUS', 'Request is already fulfilled or rejected');
        return;
      }
      if (!request.candidateId) {
        sendError(res, 400, 'NO_CANDIDATE', 'No candidate linked to this request');
        return;
      }

      // Hard delete the candidate directly via service
      const deleted = await candidatesService.deleteCandidate(request.candidateId);
      if (!deleted) {
        sendError(res, 404, 'NOT_FOUND', 'Candidate not found or already deleted');
        return;
      }

      // Update the request
      await prisma.candidateRightsRequest.update({
        where: { id: req.params.id },
        data: {
          status: 'FULFILLED',
          fulfilledAt: new Date(),
          fulfilledBy: req.user.userId,
        },
      });

      void createAuditLog({
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: AUDIT_ACTIONS.RIGHTS_REQUEST_FULFILLED,
        resourceType: 'rights_request',
        resourceId: req.params.id,
        metadata: { erasureCandidateId: request.candidateId },
        ...extractRequestMeta(req),
      });

      void createAuditLog({
        actorId: req.user.userId,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: AUDIT_ACTIONS.CANDIDATE_HARD_DELETED,
        resourceType: 'candidate',
        resourceId: request.candidateId,
        metadata: { reason: 'ERASURE_REQUEST', rightsRequestId: req.params.id },
        ...extractRequestMeta(req),
      });

      sendSuccess(res, { fulfilled: true, candidateDeleted: true });
    } catch {
      sendError(res, 500, 'ERASURE_ERROR', 'Failed to fulfil erasure request');
    }
  },
};
