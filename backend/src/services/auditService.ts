import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function createAuditLog(params: {
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        ...params,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit entry:', err);
  }
}

export function extractRequestMeta(req: Request): { ipAddress: string; userAgent: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(forwarded)
    ? forwarded[0]
    : (forwarded?.split(',')[0] ?? req.ip ?? 'unknown');
  return { ipAddress, userAgent: req.headers['user-agent'] ?? 'unknown' };
}

export const AUDIT_ACTIONS = {
  CANDIDATE_VIEWED:           'candidate.viewed',
  CANDIDATE_CREATED:          'candidate.created',
  CANDIDATE_UPDATED:          'candidate.updated',
  CANDIDATE_SOFT_DELETED:     'candidate.soft_deleted',
  CANDIDATE_HARD_DELETED:     'candidate.hard_deleted',
  CANDIDATE_ANONYMISED:       'candidate.anonymised',
  CANDIDATE_RESTORED:         'candidate.restored',
  CV_ACCESSED:                'cv.accessed',
  CV_UPLOADED:                'cv.uploaded',
  PRIVACY_NOTICE_SENT:        'candidate.privacy_notice_sent',
  PRIVACY_UPDATED:            'candidate.privacy_updated',
  FEEDBACK_CREATED:           'feedback.created',
  FEEDBACK_UPDATED:           'feedback.updated',
  STAGE_CHANGED:              'candidate.stage_changed',
  RIGHTS_REQUEST_CREATED:     'rights_request.created',
  RIGHTS_REQUEST_FULFILLED:   'rights_request.fulfilled',
  RIGHTS_REQUEST_EXPORT:      'rights_request.export_downloaded',
  RIGHTS_REQUEST_REJECTED:    'rights_request.rejected',
  RETENTION_REVIEW_RUN:       'retention.review_run',
  USER_LOGIN:                 'user.login',
  USER_LOGOUT:                'user.logout',
} as const;
