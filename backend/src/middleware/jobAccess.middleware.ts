/**
 * @file jobAccess.middleware.ts
 * @description Middleware that verifies the requesting user has access to a
 * candidate or application via JobMember membership (MANAGER/INTERVIEWER)
 * or global role (ADMIN/HR).
 */
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { sendError } from '../utils/response';

const GLOBAL_ROLES = ['ADMIN', 'HR'];

/**
 * Middleware: verify req.user can access candidate identified by req.params.candidateId.
 * ADMIN/HR pass immediately. MANAGER/INTERVIEWER must be a JobMember on at least
 * one job this candidate has an active application for.
 */
export async function checkCandidateAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const role = req.user?.role;
  const userId = req.user?.userId;
  if (!role || !userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  if (GLOBAL_ROLES.includes(role)) {
    next();
    return;
  }

  const { candidateId } = req.params;
  if (!candidateId) {
    sendError(res, 400, 'BAD_REQUEST', 'candidateId is required');
    return;
  }

  // Find jobs this candidate has applications for (candidate soft-delete is on Candidate, not Application)
  const applications = await prisma.application.findMany({
    where: { candidateId, candidate: { deletedAt: null } },
    select: { jobPostingId: true },
  });

  if (applications.length === 0) {
    sendError(res, 403, 'FORBIDDEN', 'You do not have access to this candidate');
    return;
  }

  const jobIds = applications.map((a) => a.jobPostingId);

  // Check if user is a JobMember on any of those jobs
  const membership = await prisma.jobMember.findFirst({
    where: { userId, jobId: { in: jobIds } },
  });

  if (!membership) {
    sendError(res, 403, 'FORBIDDEN', 'You do not have access to this candidate');
    return;
  }

  next();
}

/**
 * Middleware: verify req.user can access the application identified by req.params.applicationId.
 * Same logic as checkCandidateAccess but resolves the candidate via the application.
 */
export async function checkApplicationAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const role = req.user?.role;
  const userId = req.user?.userId;
  if (!role || !userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  if (GLOBAL_ROLES.includes(role)) {
    next();
    return;
  }

  const { applicationId } = req.params;
  if (!applicationId) {
    sendError(res, 400, 'BAD_REQUEST', 'applicationId is required');
    return;
  }

  const application = await prisma.application.findFirst({
    where: { id: applicationId, candidate: { deletedAt: null } },
    select: { jobPostingId: true },
  });

  if (!application) {
    sendError(res, 403, 'FORBIDDEN', 'You do not have access to this application');
    return;
  }

  const membership = await prisma.jobMember.findFirst({
    where: { userId, jobId: application.jobPostingId },
  });

  if (!membership) {
    sendError(res, 403, 'FORBIDDEN', 'You do not have access to this application');
    return;
  }

  next();
}
