import { scorecardsRepository } from '../repositories/scorecards.repository';

export interface ScorecardCriterionDto {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isRequired: boolean;
  position: number;
}

export interface ScorecardDto {
  id: string;
  name: string;
  description: string | null;
  criteriaCount: number;
  criteria: ScorecardCriterionDto[];
  createdAt: string;
}

function toDto(sc: Awaited<ReturnType<typeof scorecardsRepository.findById>>): ScorecardDto {
  if (!sc) throw new Error('Scorecard not found');
  return {
    id: sc.id,
    name: sc.name,
    description: sc.description,
    criteriaCount: sc.criteria.length,
    criteria: sc.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      description: c.description,
      isRequired: c.isRequired,
      position: c.position,
    })),
    createdAt: sc.createdAt.toISOString(),
  };
}

export const scorecardsService = {
  async getAll(): Promise<ScorecardDto[]> {
    const items = await scorecardsRepository.findAll();
    return items.map((sc) => ({
      id: sc.id,
      name: sc.name,
      description: sc.description,
      criteriaCount: sc._count.criteria,
      criteria: sc.criteria.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        description: c.description,
        isRequired: c.isRequired,
        position: c.position,
      })),
      createdAt: sc.createdAt.toISOString(),
    }));
  },

  async getById(id: string): Promise<ScorecardDto | null> {
    const sc = await scorecardsRepository.findById(id);
    if (!sc) return null;
    return toDto(sc);
  },

  async create(data: {
    name: string;
    description?: string;
    createdById: string;
    criteria: Array<{ name: string; type: string; description?: string; isRequired: boolean; position: number }>;
  }): Promise<ScorecardDto> {
    const sc = await scorecardsRepository.create(data);
    return toDto(sc);
  },

  async update(id: string, data: {
    name?: string;
    description?: string;
    criteria?: Array<{ name: string; type: string; description?: string; isRequired: boolean; position: number }>;
  }): Promise<ScorecardDto | null> {
    const existing = await scorecardsRepository.findById(id);
    if (!existing) return null;
    const sc = await scorecardsRepository.update(id, data);
    return toDto(sc);
  },

  async delete(id: string): Promise<boolean> {
    const existing = await scorecardsRepository.findById(id);
    if (!existing) return false;
    await scorecardsRepository.delete(id);
    return true;
  },
};
