/**
 * @file candidates.service.ts
 * @description Candidate business logic — list, detail, create, and tracking.
 * Maps Prisma enums to frontend-compatible lowercase strings.
 */
import { candidatesRepository } from '../repositories/candidates.repository';
import { sequencesRepository } from '../repositories/sequences.repository';
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

export interface CandidateNoteDto {
  id: string;
  content: string;
  authorName: string;
  applicationId: string | null;
  jobTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedEventDto {
  id: string;
  type: 'applied' | 'stage_changed' | 'interview_scheduled' | 'interview_completed' | 'offer_sent' | 'offer_accepted' | 'offer_rejected' | 'note_added';
  description: string;
  actor: string;
  timestamp: string;
  jobTitle?: string;
  meta?: Record<string, string | number | null>;
}

export interface FeedbackDto {
  id: string;
  interviewType: string;
  scheduledAt: string;
  status: string;
  rating: number | null;
  recommendation: string | null;
  feedback: string | null;
  jobTitle?: string;
}

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
  currentCompany?: string;
  source: string;
  skills: string[];
  tags: string[];
  doNotContact: boolean;
  doNotContactReason?: string;
  doNotContactNote?: string;
  doNotContactAt?: string;
  referrals: {
    id: string;
    referredByName: string;
    referredByEmail: string | null;
    relationship: string;
    jobId: string | null;
    jobTitle: string | null;
    note: string | null;
    referralDate: string;
    createdAt: string;
  }[];
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
      currentCompany: c.currentCompany ?? undefined,
      source: mapSource(c.source),
      skills: c.skills,
      tags: c.tags,
      doNotContact: c.doNotContact,
      doNotContactReason: c.doNotContactReason ?? undefined,
      doNotContactNote: c.doNotContactNote ?? undefined,
      doNotContactAt: c.doNotContactAt?.toISOString(),
      referrals: c.referrals.map((r) => ({
        id: r.id,
        referredByName: r.referredByName,
        referredByEmail: r.referredByEmail,
        relationship: r.relationship,
        jobId: r.jobId,
        jobTitle: r.jobTitle,
        note: r.note,
        referralDate: r.referralDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
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
      tags: c.tags,
      doNotContact: c.doNotContact,
      referrals: [],
      createdAt: c.createdAt.toISOString(),
      applications: [],
    };
  },

  // Notes CRUD
  async getNotes(candidateId: string): Promise<CandidateNoteDto[]> {
    const notes = await candidatesRepository.findNotes(candidateId);
    return notes.map((n) => ({
      id: n.id,
      content: n.content,
      authorName: n.authorName,
      applicationId: n.applicationId ?? null,
      jobTitle: n.application?.jobPosting?.title ?? null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
  },

  async createNote(candidateId: string, data: { applicationId?: string; content: string; authorName: string }): Promise<CandidateNoteDto> {
    const n = await candidatesRepository.createNote({ candidateId, ...data });
    return {
      id: n.id,
      content: n.content,
      authorName: n.authorName,
      applicationId: n.applicationId ?? null,
      jobTitle: n.application?.jobPosting?.title ?? null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  },

  async updateNote(noteId: string, content: string): Promise<CandidateNoteDto | null> {
    try {
      const n = await candidatesRepository.updateNote(noteId, content);
      return {
        id: n.id,
        content: n.content,
        authorName: n.authorName,
        applicationId: n.applicationId ?? null,
        jobTitle: n.application?.jobPosting?.title ?? null,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      };
    } catch { return null; }
  },

  async deleteNote(noteId: string): Promise<boolean> {
    try { await candidatesRepository.deleteNote(noteId); return true; } catch { return false; }
  },

  async deleteCandidate(id: string): Promise<boolean> {
    try { await candidatesRepository.deleteById(id); return true; } catch { return false; }
  },

  async setDoNotContact(id: string, data: {
    doNotContact: boolean;
    reason?: string;
    note?: string;
  }): Promise<boolean> {
    try {
      await candidatesRepository.updateDoNotContact(id, {
        doNotContact: data.doNotContact,
        doNotContactReason: data.doNotContact ? (data.reason ?? null) : null,
        doNotContactNote: data.doNotContact ? (data.note ?? null) : null,
        doNotContactAt: data.doNotContact ? new Date() : null,
      });
      if (data.doNotContact) {
        await candidatesRepository.unenrollAllSequences(id);
      }
      return true;
    } catch { return false; }
  },

  async merge(keepId: string, mergeId: string, fieldResolutions: Record<string, 'keep' | 'merge'>): Promise<boolean> {
    try {
      await candidatesRepository.merge(keepId, mergeId, fieldResolutions);
      return true;
    } catch { return false; }
  },

  async updateTags(candidateId: string, tags: string[]): Promise<string[]> {
    const c = await candidatesRepository.updateTags(candidateId, tags);
    return c.tags;
  },

  async getFeed(candidateId: string): Promise<FeedEventDto[]> {
    const data = await candidatesRepository.findFeedData(candidateId);
    if (!data) return [];

    const events: FeedEventDto[] = [];
    let counter = 0;

    for (const app of data.applications) {
      const jobTitle = app.jobPosting.title;
      events.push({ id: `evt-${counter++}`, type: 'applied', description: `Applied to ${jobTitle}`, actor: 'Candidate', timestamp: app.appliedAt.toISOString(), jobTitle });
      events.push({ id: `evt-${counter++}`, type: 'stage_changed', description: `Moved to ${app.status.charAt(0) + app.status.slice(1).toLowerCase()} for ${jobTitle}`, actor: 'Recruiter', timestamp: app.updatedAt.toISOString(), jobTitle });
      for (const iv of app.interviews) {
        events.push({ id: `evt-${counter++}`, type: 'interview_scheduled', description: `${iv.type} interview scheduled for ${jobTitle}`, actor: 'Recruiter', timestamp: iv.createdAt.toISOString(), jobTitle, meta: { interviewId: iv.id, type: iv.type } });
        if (iv.status === 'COMPLETED') {
          events.push({ id: `evt-${counter++}`, type: 'interview_completed', description: `${iv.type} interview completed for ${jobTitle}${iv.rating ? ` — rated ${iv.rating}/5` : ''}`, actor: 'Interviewer', timestamp: iv.scheduledAt.toISOString(), jobTitle, meta: { rating: iv.rating ?? null } });
        }
      }
      if (app.offer) {
        if (app.offer.sentAt) events.push({ id: `evt-${counter++}`, type: 'offer_sent', description: `Offer sent for ${jobTitle}`, actor: 'Recruiter', timestamp: app.offer.sentAt.toISOString(), jobTitle });
        if (app.offer.acceptedAt) events.push({ id: `evt-${counter++}`, type: 'offer_accepted', description: `Offer accepted for ${jobTitle}`, actor: 'Candidate', timestamp: app.offer.acceptedAt.toISOString(), jobTitle });
        if (app.offer.respondedAt && app.offer.status === 'REJECTED') events.push({ id: `evt-${counter++}`, type: 'offer_rejected', description: `Offer declined for ${jobTitle}`, actor: 'Candidate', timestamp: app.offer.respondedAt.toISOString(), jobTitle });
      }
    }

    for (const note of data.notes) {
      events.push({ id: `evt-${counter++}`, type: 'note_added', description: `Note added by ${note.authorName}`, actor: note.authorName, timestamp: note.createdAt.toISOString() });
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async getFeedback(candidateId: string): Promise<FeedbackDto[]> {
    const data = await candidatesRepository.findFeedData(candidateId);
    if (!data) return [];
    const result: FeedbackDto[] = [];
    for (const app of data.applications) {
      for (const iv of app.interviews) {
        if (iv.feedback || iv.rating || iv.recommendation) {
          result.push({
            id: iv.id,
            interviewType: mapInterviewType(iv.type),
            scheduledAt: iv.scheduledAt.toISOString(),
            status: mapInterviewStatus(iv.status),
            rating: iv.rating ?? null,
            recommendation: iv.recommendation ?? null,
            feedback: iv.feedback ?? null,
            jobTitle: app.jobPosting.title,
          });
        }
      }
    }
    return result.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
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

  // PATCH /candidates/:id — update basic profile fields
  async updateCandidate(id: string, data: { currentCompany?: string | null }) {
    await candidatesRepository.update(id, data);
  },

  // GET /candidates/:id/enrollments — all sequence enrollments for this candidate
  async getCandidateEnrollments(candidateId: string) {
    const rows = await sequencesRepository.findEnrollmentsByCandidate(candidateId);
    return rows.map((e) => ({
      id: e.id,
      sequenceId: e.sequenceId,
      sequenceName: (e.sequence as { name: string }).name,
      status: e.status,
      currentStep: e.currentStep,
      enrolledAt: e.enrolledAt.toISOString(),
    }));
  },
};
