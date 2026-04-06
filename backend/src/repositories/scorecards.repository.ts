import { prisma } from '../lib/prisma';

export const scorecardsRepository = {
  async findAll() {
    return prisma.scorecard.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { criteria: true } },
        criteria: { orderBy: { position: 'asc' } },
      },
    });
  },

  async findById(id: string) {
    return prisma.scorecard.findUnique({
      where: { id },
      include: { criteria: { orderBy: { position: 'asc' } } },
    });
  },

  async create(data: {
    name: string;
    description?: string;
    createdById: string;
    criteria: Array<{ name: string; type: string; description?: string; isRequired: boolean; position: number; allowNotes?: boolean; notesLabel?: string; notesPlaceholder?: string; notesRequired?: boolean }>;
  }) {
    return prisma.scorecard.create({
      data: {
        name: data.name,
        description: data.description,
        createdById: data.createdById,
        criteria: {
          create: data.criteria,
        },
      },
      include: { criteria: { orderBy: { position: 'asc' } } },
    });
  },

  async update(id: string, data: {
    name?: string;
    description?: string;
    criteria?: Array<{ name: string; type: string; description?: string; isRequired: boolean; position: number; allowNotes?: boolean; notesLabel?: string; notesPlaceholder?: string; notesRequired?: boolean }>;
  }) {
    // Replace all criteria when updating
    if (data.criteria !== undefined) {
      await prisma.scorecardCriterion.deleteMany({ where: { scorecardId: id } });
    }
    return prisma.scorecard.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.criteria !== undefined ? { criteria: { create: data.criteria } } : {}),
        updatedAt: new Date(),
      },
      include: { criteria: { orderBy: { position: 'asc' } } },
    });
  },

  async delete(id: string) {
    return prisma.scorecard.delete({ where: { id } });
  },
};
