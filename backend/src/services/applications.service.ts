import { applicationsRepository } from '../repositories/applications.repository';
import type { ApplicationStatus } from '@prisma/client';

function mapStatus(status: string): string {
  const map: Record<string, string> = {
    APPLIED: 'applied', SCREENING: 'screening', INTERVIEW: 'interview',
    OFFER: 'offer', HIRED: 'hired', REJECTED: 'rejected',
  };
  return map[status] ?? status.toLowerCase();
}

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

  async updateSubStage(id: string, stage: string | null) {
    const app = await applicationsRepository.findById(id);
    if (!app) return null;
    const updated = await applicationsRepository.updateSubStage(id, stage);
    return {
      id:        updated.id,
      stage:     updated.stage ?? null,
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

  async createApplication(candidateId: string, jobPostingId: string, status: string) {
    try {
      const app = await applicationsRepository.create({
        candidateId,
        jobPostingId,
        status: status as ApplicationStatus,
      });
      return {
        id:          app.id,
        candidateId: app.candidateId,
        candidateName: `${app.candidate.firstName} ${app.candidate.lastName}`,
        candidateEmail: app.candidate.email,
        skills:      app.candidate.skills,
        jobPostingId: app.jobPostingId,
        status:      mapStatus(app.status),
        appliedAt:   app.appliedAt.toISOString(),
        lastUpdated: app.updatedAt.toISOString(),
      };
    } catch (e: unknown) {
      const prismaErr = e as { code?: string };
      if (prismaErr?.code === 'P2002') return null; // unique constraint — already applied
      throw e;
    }
  },
};
