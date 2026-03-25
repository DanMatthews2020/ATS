import { prisma } from '../lib/prisma';
import type { OfferStatus } from '@prisma/client';

const INCLUDE = {
  application: {
    include: {
      candidate: { select: { id: true, firstName: true, lastName: true } },
      jobPosting: { select: { id: true, title: true, department: true } },
    },
  },
} as const;

export const offersRepository = {
  async findAll(status?: OfferStatus) {
    return prisma.offer.findMany({
      where:   status ? { status } : undefined,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.offer.findUnique({ where: { id }, include: INCLUDE });
  },

  async create(data: {
    applicationId?: string;
    candidateId?: string;
    jobId?: string;
    salary:     number;
    currency:   string;
    startDate?: string;
    expiresAt?: string;
    equity?:    string;
    benefits?:  string;
    notes?:     string;
    createdBy?: string;
  }) {
    let applicationId = data.applicationId;

    if (!applicationId) {
      if (!data.candidateId || !data.jobId) {
        throw new Error('Either applicationId or both candidateId and jobId are required');
      }
      const existing = await prisma.application.findUnique({
        where: { candidateId_jobPostingId: { candidateId: data.candidateId, jobPostingId: data.jobId } },
      });
      applicationId = existing
        ? existing.id
        : (await prisma.application.create({
            data: { candidateId: data.candidateId, jobPostingId: data.jobId, status: 'OFFER' },
          })).id;
    }

    return prisma.offer.create({
      data: {
        applicationId,
        salary:    data.salary,
        currency:  data.currency,
        startDate: data.startDate ? new Date(data.startDate) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        equity:    data.equity ?? null,
        benefits:  data.benefits ?? null,
        notes:     data.notes ?? null,
        createdBy: data.createdBy ?? null,
        status:    'DRAFT',
      },
      include: INCLUDE,
    });
  },

  async send(id: string) {
    return prisma.offer.update({
      where: { id },
      data:  { status: 'SENT', sentAt: new Date() },
      include: INCLUDE,
    });
  },

  async updateStatus(id: string, status: OfferStatus) {
    const responded = status === 'ACCEPTED' || status === 'REJECTED';
    return prisma.offer.update({
      where: { id },
      data:  { status, ...(responded ? { respondedAt: new Date() } : {}) },
      include: INCLUDE,
    });
  },

  async update(id: string, data: Partial<{
    salary:      number;
    currency:    string;
    startDate:   Date | null;
    expiresAt:   Date | null;
    equity:      string | null;
    benefits:    string;
    notes:       string;
    signatureUrl: string;
  }>) {
    return prisma.offer.update({ where: { id }, data, include: INCLUDE });
  },

  async getStats() {
    const [total, draft, sent, accepted, rejected, expired] = await Promise.all([
      prisma.offer.count(),
      prisma.offer.count({ where: { status: 'DRAFT' } }),
      prisma.offer.count({ where: { status: 'SENT' } }),
      prisma.offer.count({ where: { status: 'ACCEPTED' } }),
      prisma.offer.count({ where: { status: 'REJECTED' } }),
      prisma.offer.count({ where: { status: 'EXPIRED' } }),
    ]);
    const decided = accepted + rejected;
    return {
      total, draft, sent, accepted, rejected, expired,
      acceptanceRate: decided > 0 ? Math.round((accepted / decided) * 100) : 0,
    };
  },
};
