import type { Request, Response } from 'express';
import { candidatesService } from '../services/candidates.service';
import { sendSuccess, sendError } from '../utils/response';
import type { ApplicationStatus, CandidateSource } from '@prisma/client';

const VALID_STATUSES = new Set<string>([
  'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED',
]);

export const candidatesController = {
  // GET /candidates — paginated list with optional search
  async getCandidates(req: Request, res: Response): Promise<void> {
    try {
      const page   = Math.max(1, Number(req.query.page ?? 1));
      const limit  = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
      const search = (req.query.search as string | undefined)?.trim() || undefined;
      const result = await candidatesService.getCandidates(page, limit, search);
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch candidates');
    }
  },

  // GET /candidates/:id — full candidate profile
  async getCandidate(req: Request, res: Response): Promise<void> {
    try {
      const candidate = await candidatesService.getCandidate(req.params.id);
      if (!candidate) {
        sendError(res, 404, 'NOT_FOUND', 'Candidate not found');
        return;
      }
      sendSuccess(res, { candidate });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch candidate');
    }
  },

  // POST /candidates — create new candidate
  async createCandidate(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        linkedInUrl?: string;
        location?: string;
        source?: CandidateSource;
        skills?: string[];
      };
      const candidate = await candidatesService.createCandidate({
        ...body,
        source: body.source ?? 'JOB_BOARD',
        skills: body.skills ?? [],
      });
      sendSuccess(res, { candidate }, 201);
    } catch (err: unknown) {
      // Prisma unique constraint violation (duplicate email)
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
        sendError(res, 409, 'DUPLICATE_EMAIL', 'A candidate with this email already exists');
        return;
      }
      sendError(res, 500, 'CREATE_ERROR', 'Failed to create candidate');
    }
  },

  // GET /candidates/tracking — existing applications tracking view
  async getTracking(req: Request, res: Response): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
      const rawStatus = (req.query.status as string | undefined)?.toUpperCase();
      const status = rawStatus && VALID_STATUSES.has(rawStatus)
        ? (rawStatus as ApplicationStatus)
        : undefined;
      const jobId = req.query.jobId as string | undefined;

      const result = await candidatesService.getTracking(page, limit, status, jobId);
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch candidate tracking');
    }
  },
};
