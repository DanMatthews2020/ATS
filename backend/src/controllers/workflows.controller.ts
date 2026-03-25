import { Response } from 'express';
import { workflowsService } from '../services/workflows.service';
import { AuthRequest } from '../types';

export const workflowsController = {
  async getByJobId(req: AuthRequest, res: Response) {
    try {
      const workflow = await workflowsService.getByJobId(req.params.jobId);
      if (!workflow) return res.status(404).json({ error: 'No workflow found for this job' });
      res.json(workflow);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const workflow = await workflowsService.create({
        ...req.body,
        createdById: req.user!.userId,
      });
      res.status(201).json(workflow);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return res.status(409).json({ error: 'Workflow already exists for this job' });
      }
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const workflow = await workflowsService.update(req.params.id, req.body);
      if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
      res.json(workflow);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async addStage(req: AuthRequest, res: Response) {
    try {
      const stage = await workflowsService.addStage(req.params.id, req.body);
      res.status(201).json(stage);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updateStage(req: AuthRequest, res: Response) {
    try {
      const stage = await workflowsService.updateStage(req.params.stageId, req.body);
      res.json(stage);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async deleteStage(req: AuthRequest, res: Response) {
    try {
      await workflowsService.deleteStage(req.params.stageId);
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async reorderStages(req: AuthRequest, res: Response) {
    try {
      const { stageIds } = req.body as { stageIds: string[] };
      const workflow = await workflowsService.reorderStages(req.params.id, stageIds);
      if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
      res.json(workflow);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
