import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { projectsService } from '../services/projects.service';
import { sendSuccess, sendError } from '../utils/response';

export const projectsController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const projects = await projectsService.getAll(req.user!.userId);
      sendSuccess(res, { projects });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch projects');
    }
  },

  async getOne(req: AuthRequest, res: Response): Promise<void> {
    try {
      const project = await projectsService.getById(req.params.id);
      if (!project) {
        sendError(res, 404, 'NOT_FOUND', 'Project not found');
        return;
      }
      sendSuccess(res, { project });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch project');
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description, category, visibility, tags } = req.body as {
        name: string;
        description?: string;
        category?: string;
        visibility?: 'PRIVATE' | 'TEAM';
        tags?: string[];
      };
      const createdById = req.user!.userId;
      const project = await projectsService.create({
        name,
        description,
        category: category ?? 'GENERAL',
        visibility: visibility ?? 'PRIVATE',
        tags: tags ?? [],
        createdById,
      });
      sendSuccess(res, { project }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create project');
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, description, category, visibility, tags } = req.body as {
        name?: string;
        description?: string;
        category?: string;
        visibility?: 'PRIVATE' | 'TEAM';
        tags?: string[];
      };
      const project = await projectsService.update(req.params.id, { name, description, category, visibility, tags });
      sendSuccess(res, { project });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update project');
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      await projectsService.delete(req.params.id);
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete project');
    }
  },

  async listCandidates(req: AuthRequest, res: Response): Promise<void> {
    try {
      const candidates = await projectsService.getCandidates(req.params.id);
      sendSuccess(res, { candidates });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch project candidates');
    }
  },

  async addCandidate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { candidateId, notes } = req.body as { candidateId: string; notes?: string };
      const addedById = req.user!.userId;
      const result = await projectsService.addCandidate({
        projectId: req.params.id,
        candidateId,
        addedById,
        notes,
      });
      sendSuccess(res, result, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to add candidate to project');
    }
  },

  async removeCandidate(req: AuthRequest, res: Response): Promise<void> {
    try {
      await projectsService.removeCandidate(req.params.id, req.params.candidateId);
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to remove candidate from project');
    }
  },

  async listNotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const notes = await projectsService.getNotes(req.params.id);
      sendSuccess(res, { notes });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch project notes');
    }
  },

  async createNote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { content } = req.body as { content: string };
      const createdById = req.user!.userId;
      const note = await projectsService.createNote({ projectId: req.params.id, content, createdById });
      sendSuccess(res, { note }, 201);
    } catch {
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create project note');
    }
  },
};
