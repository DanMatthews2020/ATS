/**
 * @file sequences.service.ts
 * @description Business logic and DTOs for sequences, steps, and enrollments.
 */
import { sequencesRepository } from '../repositories/sequences.repository';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface StepDto {
  id: string;
  sequenceId: string;
  position: number;
  type: string;
  subject: string | null;
  body: string | null;
  templateId: string | null;
  templateName: string | null;
  waitDays: number | null;
  delayDays: number;
  taskDescription: string | null;
  sendTime: string | null;
  sendFrom: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceStatsDto {
  totalEnrolled: number;
  active: number;
  completed: number;
  stopped: number;
  replied: number;
  opens: number;
  clicks: number;
}

export interface SequenceListDto {
  id: string;
  name: string;
  status: string;
  stepCount: number;
  enrolledCount: number;
  senderEmail: string | null;
  linkedJobId: string | null;
  stopOnReply: boolean;
  stopOnInterview: boolean;
  stopOnHired: boolean;
  skipWeekends: boolean;
  isShared: boolean;
  maxEmails: number;
  sendingDays: string[];
  createdById: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceDetailDto extends SequenceListDto {
  steps: StepDto[];
  stats: SequenceStatsDto;
}

export interface EnrollmentDto {
  id: string;
  sequenceId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateCurrentCompany: string | null;
  currentStep: number;
  status: string;
  sendFrom: string | null;
  startDate: string;
  response: string | null;
  opens: number;
  clicks: number;
  enrolledAt: string;
  completedAt: string | null;
  stoppedAt: string | null;
  stoppedReason: string | null;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapStep(s: any): StepDto {
  return {
    id: s.id,
    sequenceId: s.sequenceId,
    position: s.position,
    type: s.type,
    subject: s.subject ?? null,
    body: s.body ?? null,
    templateId: s.templateId ?? null,
    templateName: s.template?.name ?? null,
    waitDays: s.waitDays ?? null,
    delayDays: s.delayDays ?? 0,
    taskDescription: s.taskDescription ?? null,
    sendTime: s.sendTime ?? null,
    sendFrom: s.sendFrom ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function mapSequenceBase(s: any): SequenceListDto {
  return {
    id: s.id,
    name: s.name,
    status: s.status,
    stepCount: s._count?.steps ?? (s.steps?.length ?? 0),
    enrolledCount: s._count?.enrollments ?? 0,
    senderEmail: s.senderEmail ?? null,
    linkedJobId: s.linkedJobId ?? null,
    stopOnReply: s.stopOnReply ?? true,
    stopOnInterview: s.stopOnInterview ?? true,
    stopOnHired: s.stopOnHired ?? false,
    skipWeekends: s.skipWeekends ?? true,
    isShared: s.isShared ?? false,
    maxEmails: s.maxEmails ?? 10,
    sendingDays: s.sendingDays ?? [],
    createdById: s.createdById,
    createdByName: s.createdBy ? `${s.createdBy.firstName} ${s.createdBy.lastName}` : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function mapEnrollment(e: any): EnrollmentDto {
  return {
    id: e.id,
    sequenceId: e.sequenceId,
    candidateId: e.candidateId,
    candidateName: `${e.candidate.firstName} ${e.candidate.lastName}`,
    candidateEmail: e.candidate.email,
    candidateCurrentCompany: e.candidate.currentCompany ?? null,
    currentStep: e.currentStep ?? 0,
    status: e.status,
    sendFrom: e.sendFrom ?? null,
    startDate: e.startDate.toISOString(),
    response: e.response ?? null,
    opens: e.opens ?? 0,
    clicks: e.clicks ?? 0,
    enrolledAt: e.enrolledAt.toISOString(),
    completedAt: e.completedAt ? e.completedAt.toISOString() : null,
    stoppedAt: e.stoppedAt ? e.stoppedAt.toISOString() : null,
    stoppedReason: e.stoppedReason ?? null,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const sequencesService = {
  async getAll(opts: { search?: string; status?: string }): Promise<SequenceListDto[]> {
    const items = await sequencesRepository.findAll(opts);
    return items.map(mapSequenceBase);
  },

  async getById(id: string): Promise<SequenceDetailDto | null> {
    const [item, stats] = await Promise.all([
      sequencesRepository.findById(id),
      sequencesRepository.getStats(id),
    ]);
    if (!item) return null;
    return {
      ...mapSequenceBase(item),
      steps: ((item as any).steps ?? []).map(mapStep),
      stats: {
        totalEnrolled: stats.total,
        active: stats.active,
        completed: stats.completed,
        stopped: stats.stopped,
        replied: stats.replied,
        opens: stats.opens,
        clicks: stats.clicks,
      },
    };
  },

  async create(data: {
    name: string;
    senderEmail?: string;
    linkedJobId?: string;
    stopOnReply?: boolean;
    stopOnInterview?: boolean;
    stopOnHired?: boolean;
    skipWeekends?: boolean;
    isShared?: boolean;
    maxEmails?: number;
    sendingDays?: string[];
    createdById: string;
  }): Promise<SequenceDetailDto> {
    const item = await sequencesRepository.create(data);
    return {
      ...mapSequenceBase(item),
      steps: [],
      stats: { totalEnrolled: 0, active: 0, completed: 0, stopped: 0, replied: 0, opens: 0, clicks: 0 },
    };
  },

  async update(
    id: string,
    data: {
      name?: string;
      status?: 'ACTIVE' | 'PAUSED';
      senderEmail?: string;
      linkedJobId?: string;
      stopOnReply?: boolean;
      stopOnInterview?: boolean;
      stopOnHired?: boolean;
      skipWeekends?: boolean;
      isShared?: boolean;
      maxEmails?: number;
      sendingDays?: string[];
    },
  ): Promise<SequenceListDto> {
    const item = await sequencesRepository.update(id, data);
    return mapSequenceBase(item);
  },

  async delete(id: string): Promise<void> {
    await sequencesRepository.delete(id);
  },

  async addStep(data: {
    sequenceId: string;
    position: number;
    type: 'EMAIL' | 'WAIT' | 'TASK';
    subject?: string;
    body?: string;
    templateId?: string;
    waitDays?: number;
    delayDays?: number;
    taskDescription?: string;
    sendTime?: string;
    sendFrom?: string;
  }): Promise<StepDto> {
    const item = await sequencesRepository.addStep(data);
    return mapStep(item);
  },

  async updateStep(
    id: string,
    data: {
      position?: number;
      type?: 'EMAIL' | 'WAIT' | 'TASK';
      subject?: string;
      body?: string;
      templateId?: string | null;
      waitDays?: number;
      delayDays?: number;
      taskDescription?: string;
      sendTime?: string;
      sendFrom?: string;
    },
  ): Promise<StepDto> {
    const item = await sequencesRepository.updateStep(id, data);
    return mapStep(item);
  },

  async deleteStep(id: string): Promise<void> {
    await sequencesRepository.deleteStep(id);
  },

  async getEnrollments(sequenceId: string, opts: { status?: string } = {}): Promise<EnrollmentDto[]> {
    const items = await sequencesRepository.getEnrollments(sequenceId, opts);
    return items.map(mapEnrollment);
  },

  async enroll(data: {
    sequenceId: string;
    candidateId: string;
    sendFrom?: string;
    startDate?: string;
  }): Promise<{ alreadyEnrolled: boolean; enrollment: EnrollmentDto | null }> {
    const existing = await sequencesRepository.findEnrollment(data.sequenceId, data.candidateId);
    if (existing && existing.status !== 'STOPPED') {
      return { alreadyEnrolled: true, enrollment: null };
    }
    const enrollment = await sequencesRepository.enroll({
      sequenceId: data.sequenceId,
      candidateId: data.candidateId,
      sendFrom: data.sendFrom,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
    });
    return { alreadyEnrolled: false, enrollment: mapEnrollment(enrollment) };
  },

  async unenroll(sequenceId: string, candidateId: string): Promise<void> {
    await sequencesRepository.unenroll(sequenceId, candidateId);
  },

  async setEnrollmentResponse(enrollmentId: string, response: string): Promise<EnrollmentDto> {
    const enrollment = await sequencesRepository.updateEnrollmentResponse(enrollmentId, response);
    return mapEnrollment(enrollment);
  },
};
