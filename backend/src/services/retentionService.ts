import type { LegalBasis, RetentionStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from './auditService';

// ─── Retention calculation ───────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
const MONTHS_12 = 365 * MS_PER_DAY;
const MONTHS_24 = 730 * MS_PER_DAY;
const DAYS_30 = 30 * MS_PER_DAY;

export function calculateRetentionExpiry(candidate: {
  status: string;
  legalBasis: LegalBasis;
  consentGivenAt: Date | null;
  lastActivityAt: Date | null;
  deletedAt: Date | null;
  deletedReason: string | null;
}): Date | null {
  // HIRED — flag for immediate anonymisation
  if (candidate.status === 'HIRED') {
    return new Date();
  }

  // Withdrawn (soft-deleted with MANUAL reason)
  if (candidate.deletedAt && candidate.deletedReason === 'MANUAL') {
    return new Date(candidate.deletedAt.getTime() + DAYS_30);
  }

  // REJECTED or unsuccessful
  if (candidate.status === 'REJECTED') {
    const anchor = candidate.lastActivityAt ?? new Date();
    return new Date(anchor.getTime() + MONTHS_12);
  }

  // Talent pool (consent-based)
  if (candidate.legalBasis === 'CONSENT' && candidate.consentGivenAt) {
    return new Date(candidate.consentGivenAt.getTime() + MONTHS_24);
  }

  // Active — no expiry
  return null;
}

export function isExpiringSoon(expiresAt: Date | null, warningDays = 30): boolean {
  if (!expiresAt) return false;
  const diff = expiresAt.getTime() - Date.now();
  return diff > 0 && diff <= warningDays * MS_PER_DAY;
}

export function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= Date.now();
}

export function getRetentionLabel(candidate: {
  retentionStatus: RetentionStatus;
  retentionExpiresAt: Date | null;
}): string {
  if (candidate.retentionStatus === 'ANONYMISED') return 'Anonymised';
  if (!candidate.retentionExpiresAt) return 'No expiry set';

  const diffMs = candidate.retentionExpiresAt.getTime() - Date.now();
  const days = Math.round(Math.abs(diffMs) / MS_PER_DAY);

  if (diffMs <= 0) return `Expired ${days} day${days !== 1 ? 's' : ''} ago`;
  return `Expires in ${days} day${days !== 1 ? 's' : ''}`;
}

// ─── Anonymisation ───────────────────────────────────────────────────────────

/**
 * Anonymises a candidate's personal data in place.
 * THIS OPERATION IS IRREVERSIBLE.
 */
export async function anonymiseCandidate(
  candidateId: string,
  actorId: string,
  actorEmail: string,
): Promise<{ anonymisedAt: Date }> {
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate) throw new Error('Candidate not found');
  if (candidate.isAnonymised) throw new Error('Candidate is already anonymised');

  const now = new Date();

  // Anonymise personal data
  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      firstName: 'Anonymised',
      lastName: `Candidate ${candidateId.slice(-6)}`,
      email: `anonymised-${candidateId.slice(-6)}@deleted.local`,
      phone: null,
      location: null,
      linkedInUrl: null,
      currentCompany: null,
      cvUrl: null,
      isAnonymised: true,
      anonymisedAt: now,
      retentionStatus: 'ANONYMISED',
    },
  });

  // Delete all notes for this candidate
  await prisma.candidateNote.deleteMany({ where: { candidateId } });

  // Null out interview feedback and notes for this candidate's applications
  const applicationIds = await prisma.application.findMany({
    where: { candidateId },
    select: { id: true },
  });
  if (applicationIds.length > 0) {
    await prisma.interview.updateMany({
      where: { applicationId: { in: applicationIds.map((a) => a.id) } },
      data: { feedback: null, notes: null },
    });
  }

  // TODO: If using Supabase Storage, call:
  //   await supabase.storage.from('[BUCKET_NAME]').remove([candidate.cvUrl])
  //   before nulling cvUrl. Confirm bucket name with infrastructure owner.

  void createAuditLog({
    actorId,
    actorEmail,
    action: AUDIT_ACTIONS.CANDIDATE_ANONYMISED,
    resourceType: 'candidate',
    resourceId: candidateId,
  });

  return { anonymisedAt: now };
}

// ─── Retention review job ────────────────────────────────────────────────────

export async function runRetentionReview(): Promise<{
  expiringSoon: number;
  expired: number;
  overdueRequests: number;
  processed: number;
}> {
  // Fetch candidates with a set expiry that are still ACTIVE
  const candidates = await prisma.candidate.findMany({
    where: {
      retentionStatus: 'ACTIVE',
      retentionExpiresAt: { not: null },
    },
    select: { id: true, retentionExpiresAt: true },
  });

  const expiringSoonIds: string[] = [];
  const expiredIds: string[] = [];

  for (const c of candidates) {
    if (isExpired(c.retentionExpiresAt)) {
      expiredIds.push(c.id);
    } else if (isExpiringSoon(c.retentionExpiresAt)) {
      expiringSoonIds.push(c.id);
    }
  }

  if (expiringSoonIds.length > 0) {
    await prisma.candidate.updateMany({
      where: { id: { in: expiringSoonIds } },
      data: { retentionStatus: 'EXPIRING_SOON' },
    });
  }

  if (expiredIds.length > 0) {
    await prisma.candidate.updateMany({
      where: { id: { in: expiredIds } },
      data: { retentionStatus: 'EXPIRED' },
    });
  }

  // TODO: Query CandidateRightsRequest where dueAt < now() AND status NOT IN ('FULFILLED','REJECTED')
  //   updateMany status = 'OVERDUE'. Model does not exist yet — will be added in Prompt 5 (Rights Requests).
  const overdueRequests = 0;

  const processed = expiringSoonIds.length + expiredIds.length;

  void createAuditLog({
    action: AUDIT_ACTIONS.RETENTION_REVIEW_RUN,
    resourceType: 'system',
    resourceId: 'retention-review',
    metadata: {
      expiringSoon: expiringSoonIds.length,
      expired: expiredIds.length,
      overdueRequests,
      processed,
    } as unknown as Record<string, unknown>,
  });

  return {
    expiringSoon: expiringSoonIds.length,
    expired: expiredIds.length,
    overdueRequests,
    processed,
  };
}
