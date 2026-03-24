import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { performanceService } from '../services/performance.service';
import { sendSuccess, sendError } from '../utils/response';
import type { ReviewCycleType, GoalType, GoalStatus } from '../services/performance.service';

export const performanceController = {

  getStats(req: AuthRequest, res: Response): void {
    sendSuccess(res, performanceService.getStats());
  },

  // ── Cycles

  getCycles(req: AuthRequest, res: Response): void {
    sendSuccess(res, { cycles: performanceService.getCycles() });
  },

  getCycleById(req: AuthRequest, res: Response): void {
    const cycle = performanceService.getCycleById(req.params.id);
    if (!cycle) { sendError(res, 404, 'NOT_FOUND', 'Review cycle not found'); return; }
    sendSuccess(res, { cycle });
  },

  createCycle(req: AuthRequest, res: Response): void {
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
    const cycle = performanceService.createCycle({
      name, type, startDate, endDate, dueDate,
      participantIds: participantIds ?? [],
    });
    sendSuccess(res, { cycle }, 201);
  },

  // ── Goals

  getGoals(req: AuthRequest, res: Response): void {
    sendSuccess(res, { goals: performanceService.getGoals() });
  },

  getGoalById(req: AuthRequest, res: Response): void {
    const goal = performanceService.getGoalById(req.params.id);
    if (!goal) { sendError(res, 404, 'NOT_FOUND', 'Goal not found'); return; }
    sendSuccess(res, { goal });
  },

  createGoal(req: AuthRequest, res: Response): void {
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
    const goal = performanceService.createGoal({
      title, owner, ownerId: ownerId ?? null, type,
      dueDate, targetPct: targetPct ?? 100,
      description: description ?? '',
    });
    sendSuccess(res, { goal }, 201);
  },

  updateGoal(req: AuthRequest, res: Response): void {
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
    const goal = performanceService.updateGoal(req.params.id, data);
    if (!goal) { sendError(res, 404, 'NOT_FOUND', 'Goal not found'); return; }
    sendSuccess(res, { goal });
  },

  // ── Employees

  getEmployees(req: AuthRequest, res: Response): void {
    sendSuccess(res, { employees: performanceService.getEmployees() });
  },

  getEmployeeById(req: AuthRequest, res: Response): void {
    const emp = performanceService.getEmployeeById(req.params.id);
    if (!emp) { sendError(res, 404, 'NOT_FOUND', 'Employee not found'); return; }
    sendSuccess(res, { employee: emp });
  },

  addEmployee(req: AuthRequest, res: Response): void {
    const { name, role, department, email } = req.body as {
      name: string; role: string; department: string; email: string;
    };
    if (!name || !department) {
      sendError(res, 400, 'INVALID_BODY', 'name and department are required');
      return;
    }
    const emp = performanceService.addEmployee({ name, role: role ?? '', department, email: email ?? '' });
    sendSuccess(res, { employee: emp }, 201);
  },

  // ── Charts

  getScoreDistribution(req: AuthRequest, res: Response): void {
    sendSuccess(res, { distribution: performanceService.getScoreDistribution() });
  },

  getCompetencyData(req: AuthRequest, res: Response): void {
    sendSuccess(res, { competencies: performanceService.getCompetencyData() });
  },

  // ── Users (for modals)

  getUserList(req: AuthRequest, res: Response): void {
    sendSuccess(res, { users: performanceService.getUserList() });
  },
};
