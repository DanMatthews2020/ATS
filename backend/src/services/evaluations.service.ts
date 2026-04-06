import { evaluationsRepository } from '../repositories/evaluations.repository';

export interface EvaluationResponseDto {
  id: string;
  criterionId: string;
  criterionName: string;
  criterionType: string;
  responseValue: string;
  responseNotes: string;
  allowNotes: boolean;
  notesLabel: string;
}

export interface EvaluationDto {
  id: string;
  candidateId: string;
  jobId: string;
  jobTitle: string;
  stageId: string | null;
  stageName: string | null;
  stageType: string | null;
  scorecardId: string | null;
  scorecardName: string | null;
  submittedByName: string;
  overallRecommendation: string | null;
  notes: string | null;
  status: string;
  responses: EvaluationResponseDto[];
  createdAt: string;
  updatedAt: string;
}

type EvalRow = Awaited<ReturnType<typeof evaluationsRepository.findByCandidate>>[number];

function toDto(e: EvalRow): EvaluationDto {
  return {
    id: e.id,
    candidateId: e.candidateId,
    jobId: e.jobId,
    jobTitle: e.jobPosting.title,
    stageId: e.stageId,
    stageName: e.stage?.stageName ?? null,
    stageType: e.stage?.stageType ?? null,
    scorecardId: e.scorecardId,
    scorecardName: e.scorecard?.name ?? null,
    submittedByName: `${e.submittedBy.firstName} ${e.submittedBy.lastName}`,
    overallRecommendation: e.overallRecommendation,
    notes: e.notes,
    status: e.status,
    responses: e.responses.map((r) => ({
      id: r.id,
      criterionId: r.criterionId,
      criterionName: r.criterion.name,
      criterionType: r.criterion.type,
      responseValue: r.responseValue,
      responseNotes: r.responseNotes,
      allowNotes: r.criterion.allowNotes,
      notesLabel: r.criterion.notesLabel,
    })),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export const evaluationsService = {
  async getByCandidate(candidateId: string): Promise<EvaluationDto[]> {
    const items = await evaluationsRepository.findByCandidate(candidateId);
    return items.map(toDto);
  },

  async create(data: {
    candidateId: string;
    jobId: string;
    stageId?: string;
    scorecardId?: string;
    submittedById: string;
    overallRecommendation?: string;
    notes?: string;
    status?: string;
    responses: Array<{ criterionId: string; responseValue: string; responseNotes?: string }>;
  }): Promise<EvaluationDto> {
    const e = await evaluationsRepository.create({
      ...data,
      status: data.status ?? 'submitted',
    });
    // Re-fetch with full includes
    const full = await evaluationsRepository.findByCandidate(data.candidateId);
    const created = full.find((x) => x.id === e.id);
    if (!created) throw new Error('Evaluation not found after create');
    return toDto(created);
  },

  async update(id: string, data: {
    overallRecommendation?: string;
    notes?: string;
    status?: string;
    responses?: Array<{ criterionId: string; responseValue: string; responseNotes?: string }>;
  }): Promise<EvaluationDto | null> {
    const existing = await evaluationsRepository.findById(id);
    if (!existing) return null;
    await evaluationsRepository.update(id, data);
    const full = await evaluationsRepository.findByCandidate(existing.candidateId);
    const updated = full.find((x) => x.id === id);
    if (!updated) return null;
    return toDto(updated);
  },
};
