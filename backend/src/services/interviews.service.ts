import { interviewsRepository } from '../repositories/interviews.repository';
import type { InterviewType as PrismaType, InterviewStatus as PrismaStatus } from '@prisma/client';

export type InterviewType   = 'Phone' | 'Video' | 'On-site' | 'Technical';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';
export type Recommendation  = 'hire' | 'no-hire' | 'maybe';
export interface InterviewerDto { id: string; name: string; role: string }

const TYPE_TO_DB: Record<InterviewType, PrismaType> = {
  Phone:     'PHONE',
  Video:     'VIDEO',
  'On-site': 'ON_SITE',
  Technical: 'TECHNICAL',
};

const TYPE_FROM_DB: Record<PrismaType, InterviewType> = {
  PHONE:     'Phone',
  VIDEO:     'Video',
  ON_SITE:   'On-site',
  TECHNICAL: 'Technical',
};

const STATUS_FROM_DB: Record<PrismaStatus, InterviewStatus> = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW:   'no-show',
};

type DbRow = Awaited<ReturnType<typeof interviewsRepository.findById>>;

function toDto(db: NonNullable<DbRow>) {
  return {
    id:            db.id,
    candidateId:   db.application.candidate.id,
    candidateName: `${db.application.candidate.firstName} ${db.application.candidate.lastName}`,
    jobId:         db.application.jobPosting.id,
    jobTitle:      db.application.jobPosting.title,
    interviewers:  db.interviewers.map((i) => ({
      id:   i.user.id,
      name: `${i.user.firstName} ${i.user.lastName}`,
      role: String(i.user.role),
    })),
    type:        TYPE_FROM_DB[db.type],
    status:      STATUS_FROM_DB[db.status],
    scheduledAt: db.scheduledAt.toISOString(),
    duration:    db.duration,
    meetingLink: db.meetingLink ?? null,
    location:    db.location   ?? null,
    feedback:    db.rating != null
      ? {
          rating:         db.rating,
          recommendation: (db.recommendation ?? 'maybe') as Recommendation,
          notes:          db.feedback ?? '',
          submittedAt:    db.updatedAt.toISOString(),
        }
      : null,
    notes:           db.notes     ?? '',
    calendarEventId: db.calendarMapping?.externalEventId ?? null,
    createdAt:       db.createdAt.toISOString(),
  };
}

export const interviewsService = {
  async getAll(from?: string, to?: string) {
    const rows = await interviewsRepository.findAll(from, to);
    return rows.map(toDto);
  },

  async getById(id: string) {
    const row = await interviewsRepository.findById(id);
    return row ? toDto(row) : null;
  },

  async create(data: {
    applicationId?: string;
    candidateId?: string;
    jobId?: string;
    type: InterviewType;
    scheduledAt: string;
    duration: number;
    meetingLink?: string;
    location?: string;
    notes?: string;
  }) {
    const row = await interviewsRepository.create({
      applicationId: data.applicationId,
      candidateId:   data.candidateId,
      jobId:         data.jobId,
      type:          TYPE_TO_DB[data.type],
      scheduledAt:   new Date(data.scheduledAt),
      duration:      data.duration,
      meetingLink:   data.meetingLink ?? null,
      location:      data.location   ?? null,
      notes:         data.notes,
    });
    return toDto(row);
  },

  async update(id: string, patch: Partial<{
    scheduledAt: string; duration: number;
    meetingLink: string | null; location: string | null;
    notes: string; type: InterviewType;
  }>) {
    const data: Parameters<typeof interviewsRepository.update>[1] = {};
    if (patch.scheduledAt !== undefined) data.scheduledAt = new Date(patch.scheduledAt);
    if (patch.duration    !== undefined) data.duration    = patch.duration;
    if (patch.meetingLink !== undefined) data.meetingLink = patch.meetingLink;
    if (patch.location    !== undefined) data.location    = patch.location;
    if (patch.notes       !== undefined) data.notes       = patch.notes;
    if (patch.type        !== undefined) data.type        = TYPE_TO_DB[patch.type];
    const row = await interviewsRepository.update(id, data);
    return toDto(row);
  },

  async cancel(id: string) {
    const row = await interviewsRepository.cancel(id);
    return toDto(row);
  },

  async submitFeedback(id: string, feedback: { rating: number; recommendation: Recommendation; notes: string }) {
    const row = await interviewsRepository.submitFeedback(id, feedback);
    return toDto(row);
  },

  async getUpcomingCount() {
    const rows = await interviewsRepository.findAll(new Date().toISOString());
    return rows.filter((r) => r.status === 'SCHEDULED').length;
  },
};
