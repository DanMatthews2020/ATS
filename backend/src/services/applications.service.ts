import { applicationsRepository } from '../repositories/applications.repository';
import type { ApplicationStatus } from '@prisma/client';

export const applicationsService = {
  async updateStage(id: string, status: ApplicationStatus) {
    const app = await applicationsRepository.findById(id);
    if (!app) return null;
    const updated = await applicationsRepository.updateStage(id, status);
    return {
      id: updated.id,
      status: updated.status.toLowerCase(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async updateNotes(id: string, notes: string) {
    const app = await applicationsRepository.findById(id);
    if (!app) return null;
    const updated = await applicationsRepository.updateNotes(id, notes);
    return {
      id: updated.id,
      notes: updated.notes ?? '',
      updatedAt: updated.updatedAt.toISOString(),
    };
  },
};
