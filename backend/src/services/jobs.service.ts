import { jobsRepository } from '../repositories/jobs.repository';
import type { PaginatedResponse } from '../types';

// Maps Prisma enum values to frontend-compatible strings
function mapJobType(type: string): string {
  const map: Record<string, string> = {
    FULL_TIME: 'full-time',
    PART_TIME: 'part-time',
    CONTRACT: 'contract',
  };
  return map[type] ?? type.toLowerCase();
}

function mapJobStatus(status: string): string {
  const map: Record<string, string> = {
    OPEN: 'open',
    CLOSED: 'closed',
    DRAFT: 'draft',
    ON_HOLD: 'on-hold',
  };
  return map[status] ?? status.toLowerCase();
}

export interface JobListingDto {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: string;
  description: string;
  applicantCount: number;
  postedAt: string;
}

export const jobsService = {
  async getJobs(page: number, limit: number): Promise<PaginatedResponse<JobListingDto>> {
    const skip = (page - 1) * limit;
    const { items, total } = await jobsRepository.findMany({ skip, take: limit });

    return {
      items: items.map((job) => ({
        id: job.id,
        title: job.title,
        department: job.department,
        location: job.location,
        type: mapJobType(job.type),
        status: mapJobStatus(job.status),
        description: job.description,
        applicantCount: job._count.applications,
        postedAt: (job.openedAt ?? job.createdAt).toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },
};
