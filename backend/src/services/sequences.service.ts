import { sequencesRepository } from '../repositories/sequences.repository';

export interface SequenceStepDto {
  id: string;
  sequenceId: string;
  position: number;
  type: string;
  templateId: string | null;
  templateName: string | null;
  waitDays: number | null;
  taskDescription: string | null;
  sendTime: string | null;
}

export interface SequenceDto {
  id: string;
  name: string;
  status: string;
  stepCount: number;
  enrolledCount: number;
  stopOnReply: boolean;
  stopOnInterview: boolean;
  maxEmails: number | null;
  sendingDays: string[];
  steps: SequenceStepDto[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentDto {
  id: string;
  sequenceId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  currentStep: number;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  stoppedAt: string | null;
  stoppedReason: string | null;
}

function mapStep(s: any): SequenceStepDto {
  return {
    id: s.id,
    sequenceId: s.sequenceId,
    position: s.position,
    type: s.type,
    templateId: s.templateId ?? null,
    templateName: s.template?.name ?? null,
    waitDays: s.waitDays ?? null,
    taskDescription: s.taskDescription ?? null,
    sendTime: s.sendTime ?? null,
  };
}

function mapSequence(s: any): SequenceDto {
  return {
    id: s.id,
    name: s.name,
    status: s.status,
    stepCount: s._count?.steps ?? (s.steps?.length ?? 0),
    enrolledCount: s._count?.enrollments ?? 0,
    stopOnReply: s.stopOnReply ?? false,
    stopOnInterview: s.stopOnInterview ?? false,
    maxEmails: s.maxEmails ?? null,
    sendingDays: s.sendingDays ?? [],
    steps: (s.steps ?? []).map(mapStep),
    createdById: s.createdById,
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
    candidateEmail: e.candidate.email ?? null,
    currentStep: e.currentStep ?? 0,
    status: e.status,
    enrolledAt: e.enrolledAt.toISOString(),
    completedAt: e.completedAt ? e.completedAt.toISOString() : null,
    stoppedAt: e.stoppedAt ? e.stoppedAt.toISOString() : null,
    stoppedReason: e.stoppedReason ?? null,
  };
}

export const sequencesService = {
  getAll: async (userId: string): Promise<SequenceDto[]> => {
    const items = await sequencesRepository.findAll(userId);
    return items.map(mapSequence);
  },

  getById: async (id: string): Promise<SequenceDto | null> => {
    const item = await sequencesRepository.findById(id);
    return item ? mapSequence(item) : null;
  },

  create: async (data: {
    name: string;
    stopOnReply?: boolean;
    stopOnInterview?: boolean;
    maxEmails?: number;
    sendingDays?: string[];
    createdById: string;
  }): Promise<SequenceDto> => {
    const item = await sequencesRepository.create(data);
    return mapSequence(item);
  },

  update: async (
    id: string,
    data: { name?: string; status?: 'ACTIVE' | 'PAUSED'; stopOnReply?: boolean; stopOnInterview?: boolean; maxEmails?: number; sendingDays?: string[] },
  ): Promise<SequenceDto> => {
    const item = await sequencesRepository.update(id, data);
    return mapSequence(item);
  },

  delete: async (id: string): Promise<void> => {
    await sequencesRepository.delete(id);
  },

  addStep: async (data: {
    sequenceId: string;
    position: number;
    type: 'EMAIL' | 'WAIT' | 'TASK';
    templateId?: string;
    waitDays?: number;
    taskDescription?: string;
    sendTime?: string;
  }): Promise<SequenceStepDto> => {
    const item = await sequencesRepository.addStep(data);
    return mapStep(item);
  },

  updateStep: async (
    id: string,
    data: { position?: number; type?: 'EMAIL' | 'WAIT' | 'TASK'; templateId?: string | null; waitDays?: number; taskDescription?: string; sendTime?: string },
  ): Promise<SequenceStepDto> => {
    const item = await sequencesRepository.updateStep(id, data);
    return mapStep(item);
  },

  deleteStep: async (id: string): Promise<void> => {
    await sequencesRepository.deleteStep(id);
  },

  getEnrollments: async (sequenceId: string): Promise<EnrollmentDto[]> => {
    const items = await sequencesRepository.getEnrollments(sequenceId);
    return items.map(mapEnrollment);
  },

  enroll: async (data: { sequenceId: string; candidateId: string }): Promise<{ id: string }> => {
    const item = await sequencesRepository.enroll(data);
    return { id: item.id };
  },

  unenroll: async (sequenceId: string, candidateId: string): Promise<void> => {
    await sequencesRepository.unenroll(sequenceId, candidateId);
  },
};
