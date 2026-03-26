import { followUpsRepository } from '../repositories/followups.repository';
import type { FollowUp } from '@prisma/client';

export interface FollowUpDto {
  id: string;
  candidateId: string;
  followUpDate: string;
  note: string | null;
  isCompleted: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

function map(f: FollowUp): FollowUpDto {
  return {
    id: f.id,
    candidateId: f.candidateId,
    followUpDate: f.followUpDate.toISOString(),
    note: f.note,
    isCompleted: f.isCompleted,
    createdById: f.createdById,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export const followUpsService = {
  getByCandidateId: async (candidateId: string): Promise<FollowUpDto[]> => {
    const items = await followUpsRepository.findByCandidateId(candidateId);
    return items.map(map);
  },

  create: async (data: {
    candidateId: string;
    followUpDate: string;
    note?: string;
    createdById: string;
  }): Promise<FollowUpDto> => {
    const item = await followUpsRepository.create({
      candidateId: data.candidateId,
      followUpDate: new Date(data.followUpDate),
      note: data.note,
      createdById: data.createdById,
    });
    return map(item);
  },

  update: async (id: string, data: {
    followUpDate?: string;
    note?: string;
    isCompleted?: boolean;
  }): Promise<FollowUpDto> => {
    const item = await followUpsRepository.update(id, {
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
      note: data.note,
      isCompleted: data.isCompleted,
    });
    return map(item);
  },

  delete: async (id: string): Promise<void> => {
    await followUpsRepository.delete(id);
  },
};
