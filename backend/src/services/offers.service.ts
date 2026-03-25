import { offersRepository } from '../repositories/offers.repository';
import type { OfferStatus as PrismaOfferStatus } from '@prisma/client';

export type OfferStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

const STATUS_TO_DB: Record<OfferStatus, PrismaOfferStatus> = {
  draft:    'DRAFT',
  sent:     'SENT',
  accepted: 'ACCEPTED',
  rejected: 'REJECTED',
  expired:  'EXPIRED',
};

const STATUS_FROM_DB: Record<PrismaOfferStatus, OfferStatus> = {
  DRAFT:    'draft',
  SENT:     'sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED:  'expired',
};

type DbRow = Awaited<ReturnType<typeof offersRepository.findById>>;

function toDto(db: NonNullable<DbRow>) {
  return {
    id:            db.id,
    candidateId:   db.application.candidate.id,
    candidateName: `${db.application.candidate.firstName} ${db.application.candidate.lastName}`,
    jobId:         db.application.jobPosting.id,
    jobTitle:      db.application.jobPosting.title,
    department:    db.application.jobPosting.department,
    salary:        Number(db.salary),
    currency:      db.currency,
    startDate:     db.startDate?.toISOString().slice(0, 10) ?? '',
    expiryDate:    db.expiresAt?.toISOString().slice(0, 10) ?? '',
    equity:        db.equity       ?? null,
    benefits:      db.benefits     ?? '',
    notes:         db.notes        ?? '',
    status:        STATUS_FROM_DB[db.status],
    sentAt:        db.sentAt?.toISOString()       ?? null,
    respondedAt:   db.respondedAt?.toISOString()  ?? db.acceptedAt?.toISOString() ?? null,
    signatureUrl:  db.signatureUrl ?? null,
    createdAt:     db.createdAt.toISOString(),
    createdBy:     db.createdBy    ?? '',
  };
}

export const offersService = {
  async getAll(status?: OfferStatus) {
    const rows = await offersRepository.findAll(status ? STATUS_TO_DB[status] : undefined);
    return rows.map(toDto);
  },

  async getById(id: string) {
    const row = await offersRepository.findById(id);
    return row ? toDto(row) : null;
  },

  async create(data: {
    applicationId?: string;
    candidateId?: string;
    jobId?: string;
    salary:      number;
    currency:    string;
    startDate?:  string;
    expiryDate?: string;
    equity?:     string;
    benefits?:   string;
    notes?:      string;
    createdBy?:  string;
  }) {
    const row = await offersRepository.create({
      applicationId: data.applicationId,
      candidateId:   data.candidateId,
      jobId:         data.jobId,
      salary:        data.salary,
      currency:      data.currency,
      startDate:     data.startDate,
      expiresAt:     data.expiryDate,
      equity:        data.equity,
      benefits:      data.benefits,
      notes:         data.notes,
      createdBy:     data.createdBy,
    });
    return toDto(row);
  },

  async send(id: string) {
    const existing = await offersRepository.findById(id);
    if (!existing || existing.status !== 'DRAFT') return null;
    const row = await offersRepository.send(id);
    return toDto(row);
  },

  async updateStatus(id: string, status: OfferStatus) {
    const row = await offersRepository.updateStatus(id, STATUS_TO_DB[status]);
    return toDto(row);
  },

  async update(id: string, patch: Partial<{
    salary: number; currency: string;
    startDate: string; expiryDate: string;
    equity: string; benefits: string; notes: string;
  }>) {
    const data: Parameters<typeof offersRepository.update>[1] = {};
    if (patch.salary    !== undefined) data.salary    = patch.salary;
    if (patch.currency  !== undefined) data.currency  = patch.currency;
    if (patch.startDate !== undefined) data.startDate = new Date(patch.startDate);
    if (patch.expiryDate !== undefined) data.expiresAt = new Date(patch.expiryDate);
    if (patch.equity    !== undefined) data.equity    = patch.equity;
    if (patch.benefits  !== undefined) data.benefits  = patch.benefits;
    if (patch.notes     !== undefined) data.notes     = patch.notes;
    const row = await offersRepository.update(id, data);
    return toDto(row);
  },

  async getStats() {
    return offersRepository.getStats();
  },
};
