/**
 * @file candidates.service.ts
 * @description Candidate business logic — list, detail, create, and tracking.
 * Maps Prisma enums to frontend-compatible lowercase strings.
 */
import { candidatesRepository } from '../repositories/candidates.repository';
import type { ApplicationStatus, CandidateSource } from '@prisma/client';
import type { PaginatedResponse } from '../types';

// ─── Status/source mappers ────────────────────────────────────────────────────

function mapStatus(status: ApplicationStatus): string {
  const map: Record<ApplicationStatus, string> = {
    APPLIED:   'new',
    SCREENING: 'screening',
    INTERVIEW: 'interview',
    OFFER:     'offer',
    HIRED:     'hired',
    REJECTED:  'rejected',
  };
  return map[status];
}

function mapSource(source: CandidateSource): string {
  return source.toLowerCase().replace('_', '-');
}

function mapInterviewType(type: string): string {
  const map: Record<string, string> = {
    PHONE: 'phone', VIDEO: 'video', ON_SITE: 'on-site', TECHNICAL: 'technical',
  };
  return map[type] ?? type.toLowerCase();
}

function mapInterviewStatus(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: 'scheduled', COMPLETED: 'completed',
    CANCELLED: 'cancelled', NO_SHOW: 'no-show',
  };
  return map[status] ?? status.toLowerCase();
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CandidateListDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  source: string;
  skills: string[];
  latestJobTitle?: string;
  latestStatus?: string;  // mapped CandidateStatus string
  latestAppliedAt?: string;
  createdAt: string;
}

export interface CandidateDetailDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  cvUrl?: string;
  location?: string;
  source: string;
  skills: string[];
  createdAt: string;
  applications: {
    id: string;
    status: string;
    stage?: string;
    notes?: string;
    appliedAt: string;
    lastUpdated: string;
    jobId: string;
    jobTitle: string;
    jobDepartment: string;
    jobLocation: string;
    interviews: {
      id: string;
      scheduledAt: string;
      type: string;
      status: string;
      feedback?: string;
      rating?: number;
      duration: number;
    }[];
    offer?: {
      id: string;
      salary: string;
      currency: string;
      status: string;
      sentAt?: string;
      expiresAt?: string;
    } | null;
  }[];
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

// ─── Service ──────────────────────────────────────────────────────────────────

export const candidatesService = {
  // Paginated candidate list with latest application info
  async getCandidates(
    page: number,
    limit: number,
    search?: string,
  ): Promise<PaginatedResponse<CandidateListDto>> {
    const skip = (page - 1) * limit;
    const { items, total } = await candidatesRepository.findMany({ skip, take: limit, search });

    return {
      items: items.map((c) => {
        const latest = c.applications[0];
        return {
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          email: c.email,
          phone: c.phone ?? undefined,
          location: c.location ?? undefined,
          source: mapSource(c.source),
          skills: c.skills,
          latestJobTitle: latest?.jobPosting.title,
          latestStatus: latest ? mapStatus(latest.status) : undefined,
          latestAppliedAt: latest?.appliedAt.toISOString(),
          createdAt: c.createdAt.toISOString(),
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  // Full candidate profile with all applications and interviews
  async getCandidate(id: string): Promise<CandidateDetailDto | null> {
    const c = await candidatesRepository.findById(id);
    if (!c) return null;

    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone ?? undefined,
      linkedInUrl: c.linkedInUrl ?? undefined,
      cvUrl: c.cvUrl ?? undefined,
      location: c.location ?? undefined,
      source: mapSource(c.source),
      skills: c.skills,
      createdAt: c.createdAt.toISOString(),
      applications: c.applications.map((app) => ({
        id: app.id,
        status: mapStatus(app.status),
        stage: app.stage ?? undefined,
        notes: app.notes ?? undefined,
        appliedAt: app.appliedAt.toISOString(),
        lastUpdated: app.updatedAt.toISOString(),
        jobId: app.jobPosting.id,
        jobTitle: app.jobPosting.title,
        jobDepartment: app.jobPosting.department,
        jobLocation: app.jobPosting.location,
        interviews: app.interviews.map((i) => ({
          id: i.id,
          scheduledAt: i.scheduledAt.toISOString(),
          type: mapInterviewType(i.type),
          status: mapInterviewStatus(i.status),
          feedback: i.feedback ?? undefined,
          rating: i.rating ?? undefined,
          duration: i.duration,
        })),
        offer: app.offer
          ? {
              id: app.offer.id,
              salary: app.offer.salary.toString(),
              currency: app.offer.currency,
              status: app.offer.status.toLowerCase(),
              sentAt: app.offer.sentAt?.toISOString(),
              expiresAt: app.offer.expiresAt?.toISOString(),
            }
          : null,
      })),
    };
  },

  // Create a new candidate
  async createCandidate(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    linkedInUrl?: string;
    location?: string;
    source: CandidateSource;
    skills: string[];
  }): Promise<CandidateDetailDto> {
    const c = await candidatesRepository.create({
      firstName:   data.firstName,
      lastName:    data.lastName,
      email:       data.email,
      phone:       data.phone,
      linkedInUrl: data.linkedInUrl,
      location:    data.location,
      source:      data.source,
      skills:      data.skills,
    });

    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone ?? undefined,
      linkedInUrl: c.linkedInUrl ?? undefined,
      cvUrl: c.cvUrl ?? undefined,
      location: c.location ?? undefined,
      source: mapSource(c.source),
      skills: c.skills,
      createdAt: c.createdAt.toISOString(),
      applications: [],
    };
  },

  // Existing: tracking view (applications list)
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
