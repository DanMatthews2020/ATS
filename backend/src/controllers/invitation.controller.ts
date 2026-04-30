/**
 * @file invitation.controller.ts
 * @description HTTP handlers for team member invitations.
 *
 * Routes:
 *  POST   /api/invitations         — create an invitation (auth required)
 *  GET    /api/invitations         — list all invitations (auth required)
 *  GET    /api/invitations/:token  — validate an invitation (public)
 *  POST   /api/invitations/:token/accept — accept an invitation (auth required)
 *  DELETE /api/invitations/:id     — cancel an invitation (auth required)
 */
import type { Request, Response } from 'express';
import type { AuthRequest } from '../types';
import { invitationService } from '../services/invitation.service';
import { sendSuccess, sendError } from '../utils/response';
import { isServiceError } from '../types';
import type { UserRole } from '@prisma/client';

const VALID_ROLES: UserRole[] = ['ADMIN', 'HR', 'MANAGER', 'INTERVIEWER'];

export const invitationController = {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, role, jobIds } = req.body as {
        email?: string;
        role?: UserRole;
        jobIds?: string[];
      };

      if (!email || !role) {
        sendError(res, 400, 'INVALID_BODY', 'email and role are required');
        return;
      }
      if (!VALID_ROLES.includes(role)) {
        sendError(res, 400, 'INVALID_ROLE', `role must be one of: ${VALID_ROLES.join(', ')}`);
        return;
      }

      const invitation = await invitationService.createInvitation({
        email,
        role,
        invitedById: req.user!.userId,
        jobIds,
      });
      sendSuccess(res, { invitation }, 201);
    } catch (err) {
      if (isServiceError(err)) {
        sendError(res, err.statusCode, err.code, err.message);
      } else {
        sendError(res, 500, 'INVITATION_ERROR', 'Failed to create invitation');
      }
    }
  },

  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const invitations = await invitationService.listInvitations();
      sendSuccess(res, { invitations });
    } catch {
      sendError(res, 500, 'INVITATION_ERROR', 'Failed to list invitations');
    }
  },

  async validate(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const invitation = await invitationService.validateInvitation(token);
      sendSuccess(res, { invitation });
    } catch (err) {
      if (isServiceError(err)) {
        sendError(res, err.statusCode, err.code, err.message);
      } else {
        sendError(res, 500, 'INVITATION_ERROR', 'Failed to validate invitation');
      }
    }
  },

  async accept(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const invitation = await invitationService.acceptInvitation(token, req.user!.userId);
      sendSuccess(res, { invitation });
    } catch (err) {
      if (isServiceError(err)) {
        sendError(res, err.statusCode, err.code, err.message);
      } else {
        sendError(res, 500, 'INVITATION_ERROR', 'Failed to accept invitation');
      }
    }
  },

  async cancel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await invitationService.cancelInvitation(id);
      sendSuccess(res, { deleted: true });
    } catch (err) {
      if (isServiceError(err)) {
        sendError(res, err.statusCode, err.code, err.message);
      } else {
        sendError(res, 500, 'INVITATION_ERROR', 'Failed to cancel invitation');
      }
    }
  },
};
