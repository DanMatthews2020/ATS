import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { employeesService, type EmployeeStatus } from '../services/employees.service';
import { sendSuccess, sendError } from '../utils/response';

export const employeesController = {
  async getAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { search, department, location, status } = req.query as {
        search?: string; department?: string; location?: string; status?: EmployeeStatus;
      };
      const employees = await employeesService.getAll({ search, department, location, status });
      const departments = await employeesService.getDepartments();
      const locations   = await employeesService.getLocations();
      sendSuccess(res, { employees, departments, locations, total: employees.length });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const emp = await employeesService.getById(req.params.id);
      if (!emp) { sendError(res, 404, 'NOT_FOUND', 'Employee not found'); return; }
      sendSuccess(res, { employee: emp });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'FETCH_ERROR', 'Internal server error');
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { firstName, lastName, email, phone, title, department, location, hireDate, managerId, skills, bio } = req.body as {
        firstName: string; lastName: string; email: string; phone?: string;
        title: string; department: string; location: string; hireDate: string;
        managerId?: string; skills?: string[]; bio?: string;
      };
      if (!firstName || !lastName || !email || !title || !department || !location) {
        sendError(res, 400, 'INVALID_BODY', 'firstName, lastName, email, title, department, location are required');
        return;
      }
      const emp = await employeesService.create({ firstName, lastName, email, phone, title, department, location, hireDate: hireDate ?? new Date().toISOString().slice(0, 10), managerId, skills, bio });
      sendSuccess(res, { employee: emp }, 201);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'CREATE_ERROR', 'Internal server error');
    }
  },

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const emp = await employeesService.update(req.params.id, req.body);
      if (!emp) { sendError(res, 404, 'NOT_FOUND', 'Employee not found'); return; }
      sendSuccess(res, { employee: emp });
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'UPDATE_ERROR', 'Internal server error');
    }
  },

  async exportCsv(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const csv = await employeesService.exportCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="employees-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (err) {
      console.error(err);
      sendError(res, 500, 'EXPORT_ERROR', 'Internal server error');
    }
  },
};
