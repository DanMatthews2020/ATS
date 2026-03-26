import { prisma } from '../lib/prisma';

export const projectsRepository = {
  findAll: (userId: string) =>
    prisma.project.findMany({
      where: { OR: [{ visibility: 'TEAM' }, { createdById: userId }] },
      include: { _count: { select: { candidates: true } } },
      orderBy: { updatedAt: 'desc' },
    }),

  findById: (id: string) =>
    prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { candidates: true } },
        notes: { orderBy: { createdAt: 'desc' } },
      },
    }),

  create: (data: { name: string; description?: string; category: string; visibility: 'PRIVATE' | 'TEAM'; tags: string[]; createdById: string }) =>
    prisma.project.create({ data }),

  update: (id: string, data: { name?: string; description?: string; category?: string; visibility?: 'PRIVATE' | 'TEAM'; tags?: string[] }) =>
    prisma.project.update({ where: { id }, data }),

  delete: (id: string) =>
    prisma.project.delete({ where: { id } }),

  getCandidates: (projectId: string) =>
    prisma.projectCandidate.findMany({
      where: { projectId },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, skills: true, tags: true, createdAt: true } },
        addedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { addedAt: 'desc' },
    }),

  addCandidate: (data: { projectId: string; candidateId: string; addedById: string; notes?: string }) =>
    prisma.projectCandidate.create({ data }),

  removeCandidate: (projectId: string, candidateId: string) =>
    prisma.projectCandidate.delete({ where: { projectId_candidateId: { projectId, candidateId } } }),

  getNotes: (projectId: string) =>
    prisma.projectNote.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } }),

  createNote: (data: { projectId: string; content: string; createdById: string }) =>
    prisma.projectNote.create({ data }),
};
