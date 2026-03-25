import { Response } from 'express';
import { scorecardsService } from '../services/scorecards.service';
import { AuthRequest } from '../types';

export const scorecardsController = {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const scorecards = await scorecardsService.getAll();
      res.json({ scorecards });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getById(req: AuthRequest, res: Response) {
    try {
      const sc = await scorecardsService.getById(req.params.id);
      if (!sc) return res.status(404).json({ error: 'Scorecard not found' });
      res.json(sc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const sc = await scorecardsService.create({
        ...req.body,
        createdById: req.user!.userId,
      });
      res.status(201).json(sc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const sc = await scorecardsService.update(req.params.id, req.body);
      if (!sc) return res.status(404).json({ error: 'Scorecard not found' });
      res.json(sc);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async delete_(req: AuthRequest, res: Response) {
    try {
      const ok = await scorecardsService.delete(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Scorecard not found' });
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
