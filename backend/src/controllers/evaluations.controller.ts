import { Response } from 'express';
import { evaluationsService } from '../services/evaluations.service';
import { AuthRequest } from '../types';

export const evaluationsController = {
  async getByCandidate(req: AuthRequest, res: Response) {
    try {
      const evaluations = await evaluationsService.getByCandidate(req.params.candidateId);
      res.json({ evaluations });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      const evaluation = await evaluationsService.create({
        ...req.body,
        submittedById: req.user!.userId,
      });
      res.status(201).json(evaluation);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const evaluation = await evaluationsService.update(req.params.id, req.body);
      if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
      res.json(evaluation);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
