import { candidatesRepository } from '../repositories/candidates.repository';
import type { ApplicationStatus } from '@prisma/client';
import type { PaginatedResponse } from '../types';

// Maps Prisma ApplicationStatus to the frontend CandidateStatus values
function mapStatus(status: ApplicationStatus): string {
  const map: Record<ApplicationStatus, string> = {
    APPLIED: 'new',
    SCREENING: 'screening',
    INTERVIEW: 'interview',
    OFFER: 'offer',
    HIRED: 'hired',
    REJECTED: 'rejected',
  };
  return map[status];
}

export interface CandidateTrackingDto {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  jobDepartment: string;
  status: string;
  stage: string | null;
  appliedAt: string;
  lastUpdated: string;
}

export const candidatesService = {
  async getTracking(
    page: number,
    limit: number,
    status?: ApplicationStatus,
    jobPostingId?: string,
  ): Promise<PaginatedResponse<CandidateTrackingDto>> {
    const skip = (page - 1) * limit;
    const { items, total } = await candidatesRepository.findApplications({
      skip,
      take: limit,
      status,
      jobPostingId,
    });

    return {
      items: items.map((app) => ({
        id: app.id,
        candidateId: app.candidate.id,
        candidateName: `${app.candidate.firstName} ${app.candidate.lastName}`,
        candidateEmail: app.candidate.email,
        jobTitle: app.jobPosting.title,
        jobDepartment: app.jobPosting.department,
        status: mapStatus(app.status),
        stage: app.stage,
        appliedAt: app.appliedAt.toISOString(),
        lastUpdated: app.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
};
