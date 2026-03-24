import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { teamService, type TeamRole } from '../services/team.service';
import { sendSuccess, sendError } from '../utils/response';

const VALID_ROLES: TeamRole[] = ['admin', 'recruiter', 'hiring_manager', 'viewer'];

export const teamController = {
  getAll(_req: AuthRequest, res: Response): void {
    sendSuccess(res, { members: teamService.getAll() });
  },

  invite(req: AuthRequest, res: Response): void {
    const { email, role, department } = req.body as { email?: string; role?: TeamRole; department?: string };
    if (!email || !role) {
      sendError(res, 400, 'INVALID_BODY', 'email and role are required');
      return;
    }
    if (!VALID_ROLES.includes(role)) {
      sendError(res, 400, 'INVALID_ROLE', `role must be one of: ${VALID_ROLES.join(', ')}`);
      return;
    }
    const member = teamService.invite(email, role, department);
    sendSuccess(res, { member }, 201);
  },

  updateRole(req: AuthRequest, res: Response): void {
    const { role } = req.body as { role?: TeamRole };
    if (!role || !VALID_ROLES.includes(role)) {
      sendError(res, 400, 'INVALID_ROLE', `role must be one of: ${VALID_ROLES.join(', ')}`);
      return;
    }
    const updated = teamService.updateRole(req.params.id, role);
    if (!updated) { sendError(res, 404, 'NOT_FOUND', 'Member not found'); return; }
    sendSuccess(res, { member: updated });
  },

  remove(req: AuthRequest, res: Response): void {
    const deleted = teamService.remove(req.params.id);
    if (!deleted) { sendError(res, 404, 'NOT_FOUND', 'Member not found'); return; }
    sendSuccess(res, { deleted: true });
  },
};
