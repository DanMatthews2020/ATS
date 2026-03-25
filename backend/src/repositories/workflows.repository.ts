import { prisma } from '../lib/prisma';

export const workflowsRepository = {
  async findByJobId(jobId: string) {
    return prisma.workflowTemplate.findUnique({
      where: { jobId },
      include: {
        stages: { orderBy: { position: 'asc' } },
      },
    });
  },

  async findById(id: string) {
    return prisma.workflowTemplate.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { position: 'asc' } },
      },
    });
  },

  async create(data: { jobId: string; name: string; createdById: string }) {
    return prisma.workflowTemplate.create({
      data: {
        jobId: data.jobId,
        name: data.name,
        createdById: data.createdById,
      },
      include: {
        stages: { orderBy: { position: 'asc' } },
      },
    });
  },

  async update(id: string, data: { name?: string }) {
    return prisma.workflowTemplate.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        stages: { orderBy: { position: 'asc' } },
      },
    });
  },

  async addStage(workflowId: string, data: {
    stageName: string;
    stageType: string;
    description?: string;
    position: number;
    requiresScorecard?: boolean;
  }) {
    return prisma.workflowStage.create({
      data: {
        workflowId,
        stageName: data.stageName,
        stageType: data.stageType,
        description: data.description,
        position: data.position,
        requiresScorecard: data.requiresScorecard ?? false,
      },
    });
  },

  async updateStage(stageId: string, data: {
    stageName?: string;
    stageType?: string;
    description?: string;
    position?: number;
    requiresScorecard?: boolean;
  }) {
    return prisma.workflowStage.update({
      where: { id: stageId },
      data: { ...data, updatedAt: new Date() },
    });
  },

  async deleteStage(stageId: string) {
    return prisma.workflowStage.delete({ where: { id: stageId } });
  },

  async reorderStages(workflowId: string, stageIds: string[]) {
    await prisma.$transaction(
      stageIds.map((id, index) =>
        prisma.workflowStage.update({
          where: { id },
          data: { position: index },
        })
      )
    );
  },

  async getNextPosition(workflowId: string): Promise<number> {
    const last = await prisma.workflowStage.findFirst({
      where: { workflowId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? -1) + 1;
  },
};
