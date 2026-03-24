import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { employeesService, type EmployeeStatus } from '../services/employees.service';
import { sendSuccess, sendError } from '../utils/response';

export const employeesController = {
  getAll(req: AuthRequest, res: Response): void {
    const { search, department, location, status } = req.query as {
      search?: string; department?: string; location?: string; status?: EmployeeStatus;
    };
    const employees = employeesService.getAll({ search, department, location, status });
    const departments = employeesService.getDepartments();
    const locations   = employeesService.getLocations();
    sendSuccess(res, { employees, departments, locations, total: employees.length });
  },

  getById(req: AuthRequest, res: Response): void {
    const emp = employeesService.getById(req.params.id);
    if (!emp) { sendError(res, 404, 'NOT_FOUND', 'Employee not found'); return; }
    sendSuccess(res, { employee: emp });
  },

  create(req: AuthRequest, res: Response): void {
    const { firstName, lastName, email, phone, title, department, location, hireDate, managerId, skills, bio } = req.body as {
      firstName: string; lastName: string; email: string; phone?: string;
      title: string; department: string; location: string; hireDate: string;
      managerId?: string; skills?: string[]; bio?: string;
    };
    if (!firstName || !lastName || !email || !title || !department || !location) {
      sendError(res, 400, 'INVALID_BODY', 'firstName, lastName, email, title, department, location are required');
      return;
    }
    const emp = employeesService.create({ firstName, lastName, email, phone, title, department, location, hireDate: hireDate ?? new Date().toISOString().slice(0, 10), managerId, skills, bio });
    sendSuccess(res, { employee: emp }, 201);
  },

  update(req: AuthRequest, res: Response): void {
    const emp = employeesService.update(req.params.id, req.body);
    if (!emp) { sendError(res, 404, 'NOT_FOUND', 'Employee not found'); return; }
    sendSuccess(res, { employee: emp });
  },

  exportCsv(_req: AuthRequest, res: Response): void {
    const csv = employeesService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="employees-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  },
};
