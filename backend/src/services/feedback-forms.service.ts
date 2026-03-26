import { feedbackFormsRepository } from '../repositories/feedback-forms.repository';

export interface FeedbackFormDto {
  id: string;
  name: string;
  stage: string | null;
  questions: unknown;
  submissionCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSubmissionDto {
  id: string;
  formId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  submittedByName: string;
  answers: unknown;
  overallRating: number | null;
  recommendation: string | null;
  submittedAt: string;
}

function mapForm(f: any): FeedbackFormDto {
  return {
    id: f.id,
    name: f.name,
    stage: f.stage ?? null,
    questions: f.questions,
    submissionCount: f._count?.submissions ?? 0,
    createdById: f.createdById,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

function mapSubmission(s: any): FeedbackSubmissionDto {
  return {
    id: s.id,
    formId: s.formId,
    candidateId: s.candidateId,
    candidateName: `${s.candidate.firstName} ${s.candidate.lastName}`,
    candidateEmail: s.candidate.email ?? null,
    submittedByName: `${s.submittedBy.firstName} ${s.submittedBy.lastName}`,
    answers: s.answers,
    overallRating: s.overallRating ?? null,
    recommendation: s.recommendation ?? null,
    submittedAt: s.submittedAt.toISOString(),
  };
}

export const feedbackFormsService = {
  getAll: async (): Promise<FeedbackFormDto[]> => {
    const items = await feedbackFormsRepository.findAll();
    return items.map(mapForm);
  },

  getById: async (id: string): Promise<FeedbackFormDto | null> => {
    const item = await feedbackFormsRepository.findById(id);
    return item ? mapForm(item) : null;
  },

  create: async (data: {
    name: string;
    stage?: string;
    questions?: unknown;
    createdById: string;
  }): Promise<FeedbackFormDto> => {
    const item = await feedbackFormsRepository.create({
      name: data.name,
      stage: data.stage,
      questions: data.questions ?? [],
      createdById: data.createdById,
    });
    return mapForm(item);
  },

  update: async (
    id: string,
    data: { name?: string; stage?: string; questions?: unknown },
  ): Promise<FeedbackFormDto> => {
    const item = await feedbackFormsRepository.update(id, data);
    return mapForm(item);
  },

  delete: async (id: string): Promise<void> => {
    await feedbackFormsRepository.delete(id);
  },

  getSubmissions: async (formId: string): Promise<FeedbackSubmissionDto[]> => {
    const items = await feedbackFormsRepository.getSubmissions(formId);
    return items.map(mapSubmission);
  },

  createSubmission: async (data: {
    formId: string;
    candidateId: string;
    applicationId?: string;
    submittedById: string;
    answers: unknown;
    overallRating?: number;
    recommendation?: string;
  }): Promise<{ id: string }> => {
    const item = await feedbackFormsRepository.createSubmission(data);
    return { id: (item as any).id };
  },
};
