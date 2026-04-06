import { prisma } from '../lib/prisma';

export const evaluationsRepository = {
  async findByCandidate(candidateId: string) {
    return prisma.candidateEvaluation.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: {
        scorecard: {
          include: { criteria: { orderBy: { position: 'asc' } } },
        },
        stage: { select: { id: true, stageName: true, stageType: true, position: true } },
        submittedBy: { select: { firstName: true, lastName: true } },
        responses: { include: { criterion: true } },
        jobPosting: { select: { title: true } },
      },
    });
  },

  async findById(id: string) {
    return prisma.candidateEvaluation.findUnique({
      where: { id },
      include: {
        scorecard: { include: { criteria: { orderBy: { position: 'asc' } } } },
        stage: { select: { id: true, stageName: true, stageType: true } },
        responses: { include: { criterion: true } },
      },
    });
  },

  async create(data: {
    candidateId: string;
    jobId: string;
    stageId?: string;
    scorecardId?: string;
    submittedById: string;
    overallRecommendation?: string;
    notes?: string;
    status: string;
    responses: Array<{ criterionId: string; responseValue: string; responseNotes?: string }>;
  }) {
    return prisma.candidateEvaluation.create({
      data: {
        candidateId: data.candidateId,
        jobId: data.jobId,
        stageId: data.stageId,
        scorecardId: data.scorecardId,
        submittedById: data.submittedById,
        overallRecommendation: data.overallRecommendation,
        notes: data.notes,
        status: data.status,
        responses: {
          create: data.responses,
        },
      },
      include: {
        scorecard: { include: { criteria: { orderBy: { position: 'asc' } } } },
        responses: { include: { criterion: true } },
      },
    });
  },

  async update(id: string, data: {
    overallRecommendation?: string;
    notes?: string;
    status?: string;
    responses?: Array<{ criterionId: string; responseValue: string; responseNotes?: string }>;
  }) {
    if (data.responses !== undefined) {
      await prisma.evaluationResponse.deleteMany({ where: { evaluationId: id } });
    }
    return prisma.candidateEvaluation.update({
      where: { id },
      data: {
        ...(data.overallRecommendation !== undefined ? { overallRecommendation: data.overallRecommendation } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.responses !== undefined ? { responses: { create: data.responses } } : {}),
        updatedAt: new Date(),
      },
      include: {
        scorecard: { include: { criteria: { orderBy: { position: 'asc' } } } },
        responses: { include: { criterion: true } },
      },
    });
  },
};
