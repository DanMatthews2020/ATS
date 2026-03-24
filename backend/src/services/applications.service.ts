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
};
