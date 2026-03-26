import { projectsRepository } from '../repositories/projects.repository';

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  category: string;
  visibility: string;
  tags: string[];
  candidateCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCandidateDto {
  id: string;
  projectId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  candidateSkills: string[];
  addedByName: string;
  notes: string | null;
  addedAt: string;
}

export interface ProjectNoteDto {
  id: string;
  projectId: string;
  content: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

function mapProject(p: any): ProjectDto {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    category: p.category,
    visibility: p.visibility,
    tags: p.tags ?? [],
    candidateCount: (p as any)._count?.candidates ?? 0,
    createdById: p.createdById,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function mapProjectCandidate(pc: any): ProjectCandidateDto {
  return {
    id: pc.id,
    projectId: pc.projectId,
    candidateId: pc.candidateId,
    candidateName: `${pc.candidate.firstName} ${pc.candidate.lastName}`,
    candidateEmail: pc.candidate.email ?? null,
    candidateSkills: pc.candidate.skills ?? [],
    addedByName: `${pc.addedBy.firstName} ${pc.addedBy.lastName}`,
    notes: pc.notes ?? null,
    addedAt: pc.addedAt.toISOString(),
  };
}

function mapProjectNote(n: any): ProjectNoteDto {
  return {
    id: n.id,
    projectId: n.projectId,
    content: n.content,
    createdById: n.createdById,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

export const projectsService = {
  getAll: async (userId: string): Promise<ProjectDto[]> => {
    const items = await projectsRepository.findAll(userId);
    return items.map(mapProject);
  },

  getById: async (id: string): Promise<ProjectDto | null> => {
    const item = await projectsRepository.findById(id);
    return item ? mapProject(item) : null;
  },

  create: async (data: {
    name: string;
    description?: string;
    category: string;
    visibility: 'PRIVATE' | 'TEAM';
    tags: string[];
    createdById: string;
  }): Promise<ProjectDto> => {
    const item = await projectsRepository.create(data);
    return mapProject(item);
  },

  update: async (
    id: string,
    data: { name?: string; description?: string; category?: string; visibility?: 'PRIVATE' | 'TEAM'; tags?: string[] },
  ): Promise<ProjectDto> => {
    const item = await projectsRepository.update(id, data);
    return mapProject(item);
  },

  delete: async (id: string): Promise<void> => {
    await projectsRepository.delete(id);
  },

  getCandidates: async (projectId: string): Promise<ProjectCandidateDto[]> => {
    const items = await projectsRepository.getCandidates(projectId);
    return items.map(mapProjectCandidate);
  },

  addCandidate: async (data: {
    projectId: string;
    candidateId: string;
    addedById: string;
    notes?: string;
  }): Promise<{ id: string }> => {
    const item = await projectsRepository.addCandidate(data);
    return { id: item.id };
  },

  removeCandidate: async (projectId: string, candidateId: string): Promise<void> => {
    await projectsRepository.removeCandidate(projectId, candidateId);
  },

  getNotes: async (projectId: string): Promise<ProjectNoteDto[]> => {
    const items = await projectsRepository.getNotes(projectId);
    return items.map(mapProjectNote);
  },

  createNote: async (data: {
    projectId: string;
    content: string;
    createdById: string;
  }): Promise<ProjectNoteDto> => {
    const item = await projectsRepository.createNote(data);
    return mapProjectNote(item);
  },
};
