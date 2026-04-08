import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { performanceService } from '../services/performance.service';
import { sendSuccess, sendError } from '../utils/response';
import type { ReviewCycleType, GoalType, GoalStatus } from '../services/performance.service';

export const performanceController = {

  async getStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, await performanceService.getStats());
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  // ── Cycles

  async getCycles(req: AuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, { cycles: await performanceService.getCycles() });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getCycleById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const cycle = await performanceService.getCycleById(req.params.id);
      if (!cycle) { sendError(res, 404, 'NOT_FOUND', 'Review cycle not found'); return; }
      sendSuccess(res, { cycle });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async createCycle(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, type, startDate, endDate, dueDate, participantIds } = req.body as {
        name: string;
        type: ReviewCycleType;
        startDate: string;
        endDate: string;
        dueDate: string;
        participantIds: string[];
      };
      if (!name || !type || !startDate || !endDate || !dueDate) {
        sendError(res, 400, 'INVALID_BODY', 'name, type, startDate, endDate, dueDate are required');
        return;
      }
      const cycle = await performanceService.createCycle({
        name, type, startDate, endDate, dueDate,
        participantIds: participantIds ?? [],
      });
      sendSuccess(res, { cycle }, 201);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'CREATE_ERROR', 'Internal server error');
    }
  },

  // ── Goals

  async getGoals(req: AuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, { goals: await performanceService.getGoals() });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getGoalById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const goal = await performanceService.getGoalById(req.params.id);
      if (!goal) { sendError(res, 404, 'NOT_FOUND', 'Goal not found'); return; }
      sendSuccess(res, { goal });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async createGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, owner, ownerId, type, dueDate, targetPct, description } = req.body as {
        title:       string;
        owner:       string;
        ownerId:     string | null;
        type:        GoalType;
        dueDate:     string;
        targetPct:   number;
        description: string;
      };
      if (!title || !owner || !type || !dueDate) {
        sendError(res, 400, 'INVALID_BODY', 'title, owner, type, dueDate are required');
        return;
      }
      const goal = await performanceService.createGoal({
        title, owner, ownerId: ownerId ?? null, type,
        dueDate, targetPct: targetPct ?? 100,
        description: description ?? '',
      });
      sendSuccess(res, { goal }, 201);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'CREATE_ERROR', 'Internal server error');
    }
  },

  async updateGoal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = req.body as {
        title?:       string;
        owner?:       string;
        ownerId?:     string | null;
        type?:        GoalType;
        dueDate?:     string;
        progress?:    number;
        targetPct?:   number;
        status?:      GoalStatus;
        description?: string;
      };
      const goal = await performanceService.updateGoal(req.params.id, data);
      if (!goal) { sendError(res, 404, 'NOT_FOUND', 'Goal not found'); return; }
      sendSuccess(res, { goal });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'UPDATE_ERROR', 'Internal server error');
    }
  },

  // ── Employees

  async getEmployees(req: AuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, { employees: await performanceService.getEmployees() });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getEmployeeById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const emp = await performanceService.getEmployeeById(req.params.id);
      if (!emp) { sendError(res, 404, 'NOT_FOUND', 'Employee not found'); return; }
      sendSuccess(res, { employee: emp });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async addEmployee(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, role, department, email } = req.body as {
        name: string; role: string; department: string; email: string;
      };
      if (!name || !department) {
        sendError(res, 400, 'INVALID_BODY', 'name and department are required');
        return;
      }
      const emp = await performanceService.addEmployee({ name, role: role ?? '', department, email: email ?? '' });
      sendSuccess(res, { employee: emp }, 201);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'CREATE_ERROR', 'Internal server error');
    }
  },

  // ── Charts

  async getScoreDistribution(req: AuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, { distribution: await performanceService.getScoreDistribution() });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getCompetencyData(req: AuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, { competencies: await performanceService.getCompetencyData() });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  // ── Users (for modals)

  async getUserList(req: AuthRequest, res: Response): Promise<void> {
    try {
      sendSuccess(res, { users: await performanceService.getUserList() });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },
};
