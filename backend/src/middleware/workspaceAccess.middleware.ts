/**
 * @file workspaceAccess.middleware.ts
 * @description Extended access middleware for workspace-scoped resources.
 * - requireJobAccess: verify user has access to a job via JobMember or global role
 * - requireInterviewAccess: verify user is an InterviewParticipant or has job access
 * - requireStageChangeAccess: block MANAGER/INTERVIEWER from pipeline stage changes
 */
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import { prisma } from '../lib/prisma';
import { sendError } from '../utils/response';

const GLOBAL_ROLES = ['ADMIN', 'HR'];

/**
 * Verify req.user can access the job identified by req.params.jobId.
 * ADMIN/HR pass immediately. MANAGER/INTERVIEWER must be a JobMember.
 */
export async function requireJobAccess(
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

  const { jobId } = req.params;
  if (!jobId) {
    sendError(res, 400, 'BAD_REQUEST', 'jobId is required');
    return;
  }

  const membership = await prisma.jobMember.findFirst({
    where: { userId, jobId },
  });

  if (!membership) {
    sendError(res, 403, 'FORBIDDEN', 'You do not have access to this job');
    return;
  }

  next();
}

/**
 * Verify req.user can access the interview identified by req.params.interviewId (or req.params.id).
 * ADMIN/HR pass immediately. Others must be an InterviewParticipant or a JobMember
 * on the interview's associated job.
 */
export async function requireInterviewAccess(
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

  const interviewId = req.params.interviewId ?? req.params.id;
  if (!interviewId) {
    sendError(res, 400, 'BAD_REQUEST', 'interviewId is required');
    return;
  }

  // Check InterviewParticipant first
  const participant = await prisma.interviewParticipant.findFirst({
    where: { interviewId, userId },
  });

  if (participant) {
    next();
    return;
  }

  // Fall back to JobMember on the interview's job (single query)
  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    select: {
      application: {
        select: {
          jobPosting: {
            select: {
              members: { where: { userId }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!interview) {
    sendError(res, 404, 'NOT_FOUND', 'Interview not found');
    return;
  }

  if (interview.application.jobPosting.members.length === 0) {
    sendError(res, 403, 'FORBIDDEN', 'You do not have access to this interview');
    return;
  }

  next();
}

/**
 * Block MANAGER and INTERVIEWER from pipeline stage changes.
 * Only ADMIN/HR can move candidates through stages.
 */
export async function requireStageChangeAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const role = req.user?.role;
  if (!role) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  if (GLOBAL_ROLES.includes(role)) {
    next();
    return;
  }

  sendError(res, 403, 'FORBIDDEN', 'Only ADMIN and HR can change pipeline stages');
}
