/**
 * @file jobs.service.ts
 * @description Job postings business logic.
 *
 * Maps Prisma enum values (FULL_TIME, OPEN, etc.) to the lowercase,
 * hyphenated strings expected by the frontend components (full-time, open).
 * Returns paginated DTOs rather than raw Prisma models.
 */
import { jobsRepository } from '../repositories/jobs.repository';
import type { PaginatedResponse } from '../types';
import type { JobStatus } from '@prisma/client';

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

function mapApplicationStatus(status: string): string {
  const map: Record<string, string> = {
    APPLIED:   'applied',
    SCREENING: 'screening',
    INTERVIEW: 'interview',
    OFFER:     'offer',
    HIRED:     'hired',
    REJECTED:  'rejected',
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

export interface JobApplicantDto {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  stage: string | null;
  appliedAt: string;
  lastUpdated: string;
  interviewCount: number;
  offerStatus: string | null;
}

export interface JobDetailDto extends JobListingDto {
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  createdByName: string;
  createdAt: string;
  applications: JobApplicantDto[];
}

export interface PipelineApplicationDto {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string | null;
  candidateLocation: string | null;
  cvUrl: string | null;
  source: string;
  status: string;
  stage: string | null;
  notes: string | null;
  appliedAt: string;
  lastUpdated: string;
  skills: string[];
  interviewCount: number;
  interviewRatings: (number | null)[];
  offerStatus: string | null;
  score: number;
}

export interface JobPipelineStageCounts {
  leads: number;
  applicationReview: number;
  active: number;
  pendingOffer: number;
  hired: number;
  archived: number;
}

export type JobPipelineStatsDto = Record<string, JobPipelineStageCounts>;

export interface JobStatsDto {
  openPositions: number;
  totalApplicants: number;
  interviewsThisWeek: number;
  offersExtended: number;
}

function computeMatchScore(appId: string, skillCount: number, ratings: (number | null)[]): number {
  const hash = appId.replace(/-/g, '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const base = 50 + (hash % 25);
  const skillBonus = Math.min(15, skillCount * 2);
  const validRatings = ratings.filter((r): r is number => r !== null);
  const ratingBonus = validRatings.length > 0
    ? Math.round(validRatings.reduce((a, r) => a + r, 0) / validRatings.length) * 2
    : 0;
  return Math.min(98, base + skillBonus + ratingBonus);
}

type AppRow = Awaited<ReturnType<typeof jobsRepository.findApplicationsByJobId>>[number];

function toApplicationDto(app: AppRow): PipelineApplicationDto {
  const ratings = app.interviews.map((iv) => iv.rating);
  return {
    id:                app.id,
    candidateId:       app.candidate.id,
    candidateName:     `${app.candidate.firstName} ${app.candidate.lastName}`,
    candidateEmail:    app.candidate.email,
    candidatePhone:    app.candidate.phone ?? null,
    candidateLocation: app.candidate.location ?? null,
    cvUrl:             app.candidate.cvUrl ?? null,
    source:            app.candidate.source,
    status:            mapApplicationStatus(app.status),
    stage:             app.stage,
    notes:             app.notes ?? null,
    appliedAt:         app.appliedAt.toISOString(),
    lastUpdated:       app.updatedAt.toISOString(),
    skills:            app.candidate.skills,
    interviewCount:    app._count.interviews,
    interviewRatings:  ratings,
    offerStatus:       app.offer ? mapApplicationStatus(app.offer.status) : null,
    score:             computeMatchScore(app.id, app.candidate.skills.length, ratings),
  };
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

  async getJobById(id: string): Promise<JobDetailDto | null> {
    const job = await jobsRepository.findById(id);
    if (!job) return null;
    return {
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      type: mapJobType(job.type),
      status: mapJobStatus(job.status),
      description: job.description,
      requirements: job.requirements ?? undefined,
      salaryMin: job.salaryMin ? Number(job.salaryMin) : undefined,
      salaryMax: job.salaryMax ? Number(job.salaryMax) : undefined,
      applicantCount: job._count.applications,
      postedAt: (job.openedAt ?? job.createdAt).toISOString(),
      createdByName: `${job.createdBy.firstName} ${job.createdBy.lastName}`,
      createdAt: job.createdAt.toISOString(),
      applications: job.applications.map((app) => ({
        id: app.id,
        candidateId: app.candidate.id,
        candidateName: `${app.candidate.firstName} ${app.candidate.lastName}`,
        candidateEmail: app.candidate.email,
        status: mapApplicationStatus(app.status),
        stage: app.stage,
        appliedAt: app.appliedAt.toISOString(),
        lastUpdated: app.updatedAt.toISOString(),
        interviewCount: app._count.interviews,
        offerStatus: app.offer ? mapApplicationStatus(app.offer.status) : null,
      })),
    };
  },

  async createJob(data: {
    title: string;
    department: string;
    location: string;
    type: string;
    status?: string;
    description: string;
    requirements?: string;
    salaryMin?: number;
    salaryMax?: number;
    createdById: string;
  }): Promise<JobDetailDto> {
    const job = await jobsRepository.create({
      title: data.title,
      department: data.department,
      location: data.location,
      type: data.type as import('@prisma/client').JobType,
      status: (data.status as import('@prisma/client').JobStatus) ?? 'DRAFT',
      description: data.description,
      requirements: data.requirements,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      createdBy: { connect: { id: data.createdById } },
    });
    return {
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      type: mapJobType(job.type),
      status: mapJobStatus(job.status),
      description: job.description,
      requirements: job.requirements ?? undefined,
      salaryMin: job.salaryMin ? Number(job.salaryMin) : undefined,
      salaryMax: job.salaryMax ? Number(job.salaryMax) : undefined,
      applicantCount: 0,
      postedAt: (job.openedAt ?? job.createdAt).toISOString(),
      createdByName: '',
      createdAt: job.createdAt.toISOString(),
      applications: [],
    };
  },

  async updateJobStatus(id: string, status: string): Promise<JobDetailDto | null> {
    const existing = await jobsRepository.findById(id);
    if (!existing) return null;
    const updateData: import('@prisma/client').Prisma.JobPostingUpdateInput = {
      status: status as JobStatus,
      updatedAt: new Date(),
    };
    if (status === 'OPEN' && !existing.openedAt) updateData.openedAt = new Date();
    if (status === 'CLOSED') updateData.closedAt = new Date();
    await jobsRepository.update(id, updateData);
    return jobsService.getJobById(id);
  },

  async getJobApplications(jobId: string): Promise<PipelineApplicationDto[]> {
    const apps = await jobsRepository.findApplicationsByJobId(jobId);
    return apps.map(toApplicationDto);
  },

  async getJobCandidates(jobId: string, stage?: string): Promise<PipelineApplicationDto[]> {
    const STAGE_TO_STATUS: Record<string, string> = {
      'leads':               'APPLIED',
      'application-review':  'SCREENING',
      'active':              'INTERVIEW',
      'pending-offer':       'OFFER',
      'hired':               'HIRED',
      'archived':            'REJECTED',
    };
    const dbStatus = stage ? STAGE_TO_STATUS[stage] : undefined;
    const apps = await jobsRepository.findApplicationsByJobId(jobId, dbStatus);
    return apps.map(toApplicationDto);
  },

  async getJobPipelineStats(jobId: string): Promise<JobPipelineStageCounts> {
    const raw = await jobsRepository.getPipelineStatsByJobId(jobId);
    return {
      leads:             raw['APPLIED']   ?? 0,
      applicationReview: raw['SCREENING'] ?? 0,
      active:            raw['INTERVIEW'] ?? 0,
      pendingOffer:      raw['OFFER']     ?? 0,
      hired:             raw['HIRED']     ?? 0,
      archived:          raw['REJECTED']  ?? 0,
    };
  },

  async getPipelineStats(): Promise<JobPipelineStatsDto> {
    const raw = await jobsRepository.getPipelineStats();
    const result: JobPipelineStatsDto = {};
    for (const [jobId, counts] of Object.entries(raw)) {
      result[jobId] = {
        leads:             counts['APPLIED']   ?? 0,
        applicationReview: counts['SCREENING'] ?? 0,
        active:            counts['INTERVIEW'] ?? 0,
        pendingOffer:      counts['OFFER']     ?? 0,
        hired:             counts['HIRED']     ?? 0,
        archived:          counts['REJECTED']  ?? 0,
      };
    }
    return result;
  },

  async getStats(): Promise<JobStatsDto> {
    return jobsRepository.getStats();
  },
};
