import { referralsRepository } from '../repositories/referrals.repository';

export interface ReferralDto {
  id: string;
  candidateId: string;
  referredByName: string;
  referredByEmail: string | null;
  relationship: string;
  jobId: string | null;
  jobTitle: string | null;
  note: string | null;
  referralDate: string;
  createdAt: string;
}

function mapReferral(r: {
  id: string;
  candidateId: string;
  referredByName: string;
  referredByEmail: string | null;
  relationship: string;
  jobId: string | null;
  jobTitle: string | null;
  note: string | null;
  referralDate: Date;
  createdAt: Date;
}): ReferralDto {
  return {
    id: r.id,
    candidateId: r.candidateId,
    referredByName: r.referredByName,
    referredByEmail: r.referredByEmail,
    relationship: r.relationship,
    jobId: r.jobId,
    jobTitle: r.jobTitle,
    note: r.note,
    referralDate: r.referralDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}

export const referralsService = {
  async create(data: {
    candidateId: string;
    referredByName: string;
    referredByEmail?: string;
    relationship: string;
    jobId?: string;
    jobTitle?: string;
    note?: string;
    referralDate: string;
  }): Promise<ReferralDto> {
    const r = await referralsRepository.create({
      ...data,
      referralDate: new Date(data.referralDate),
    });
    return mapReferral(r);
  },

  async getByCandidateId(candidateId: string): Promise<ReferralDto[]> {
    const items = await referralsRepository.findByCandidateId(candidateId);
    return items.map(mapReferral);
  },

  async delete(id: string): Promise<boolean> {
    try { await referralsRepository.deleteById(id); return true; } catch { return false; }
  },
};
