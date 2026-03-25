import { workflowsRepository } from '../repositories/workflows.repository';

export interface WorkflowStageDto {
  id: string;
  stageName: string;
  stageType: string;
  description: string | null;
  position: number;
  requiresScorecard: boolean;
  scorecardId: string | null;
  scorecardName: string | null;
}

export interface WorkflowTemplateDto {
  id: string;
  jobId: string;
  name: string;
  stages: WorkflowStageDto[];
  createdAt: string;
}

function toStageDto(stage: {
  id: string;
  stageName: string;
  stageType: string;
  description: string | null;
  position: number;
  requiresScorecard: boolean;
  scorecardId?: string | null;
  scorecard?: { id: string; name: string } | null;
}): WorkflowStageDto {
  return {
    id: stage.id,
    stageName: stage.stageName,
    stageType: stage.stageType,
    description: stage.description,
    position: stage.position,
    requiresScorecard: stage.requiresScorecard,
    scorecardId: stage.scorecardId ?? null,
    scorecardName: stage.scorecard?.name ?? null,
  };
}

function toDto(workflow: {
  id: string;
  jobId: string;
  name: string;
  createdAt: Date;
  stages: {
    id: string;
    stageName: string;
    stageType: string;
    description: string | null;
    position: number;
    requiresScorecard: boolean;
    scorecardId?: string | null;
    scorecard?: { id: string; name: string } | null;
  }[];
}): WorkflowTemplateDto {
  return {
    id: workflow.id,
    jobId: workflow.jobId,
    name: workflow.name,
    stages: workflow.stages.map(toStageDto),
    createdAt: workflow.createdAt.toISOString(),
  };
}

export const workflowsService = {
  async getByJobId(jobId: string): Promise<WorkflowTemplateDto | null> {
    const workflow = await workflowsRepository.findByJobId(jobId);
    if (!workflow) return null;
    return toDto(workflow);
  },

  async create(data: {
    jobId: string;
    name?: string;
    createdById: string;
    stages?: Array<{
      stageName: string;
      stageType: string;
      description?: string;
      requiresScorecard?: boolean;
    }>;
  }): Promise<WorkflowTemplateDto> {
    const workflow = await workflowsRepository.create({
      jobId: data.jobId,
      name: data.name ?? 'Interview Workflow',
      createdById: data.createdById,
    });

    if (data.stages && data.stages.length > 0) {
      for (let i = 0; i < data.stages.length; i++) {
        const s = data.stages[i];
        await workflowsRepository.addStage(workflow.id, {
          stageName: s.stageName,
          stageType: s.stageType,
          description: s.description,
          position: i,
          requiresScorecard: s.requiresScorecard,
        });
      }
    }

    const fresh = await workflowsRepository.findById(workflow.id);
    return toDto(fresh!);
  },

  async update(id: string, data: { name?: string }): Promise<WorkflowTemplateDto | null> {
    const workflow = await workflowsRepository.update(id, data);
    return toDto(workflow);
  },

  async addStage(workflowId: string, data: {
    stageName: string;
    stageType: string;
    description?: string;
    requiresScorecard?: boolean;
    scorecardId?: string | null;
  }): Promise<WorkflowStageDto> {
    const position = await workflowsRepository.getNextPosition(workflowId);
    const stage = await workflowsRepository.addStage(workflowId, {
      ...data,
      position,
    });
    return toStageDto(stage);
  },

  async updateStage(stageId: string, data: {
    stageName?: string;
    stageType?: string;
    description?: string;
    requiresScorecard?: boolean;
    scorecardId?: string | null;
  }): Promise<WorkflowStageDto> {
    const stage = await workflowsRepository.updateStage(stageId, data);
    return toStageDto(stage);
  },

  async deleteStage(stageId: string): Promise<void> {
    await workflowsRepository.deleteStage(stageId);
  },

  async reorderStages(workflowId: string, stageIds: string[]): Promise<WorkflowTemplateDto | null> {
    await workflowsRepository.reorderStages(workflowId, stageIds);
    const workflow = await workflowsRepository.findById(workflowId);
    if (!workflow) return null;
    return toDto(workflow);
  },
};
