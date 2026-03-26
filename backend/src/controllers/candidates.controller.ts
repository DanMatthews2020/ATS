import type { Request, Response } from 'express';
import type { AuthRequest } from '../types';
import { candidatesService } from '../services/candidates.service';
import { parseCvBuffer } from '../services/cv-parser.service';
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

  // POST /candidates/parse-cv — parse an uploaded CV with Claude
  async parseCv(req: Request, res: Response): Promise<void> {
    try {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        sendError(res, 400, 'NO_FILE', 'No file uploaded. Send a PDF or plain-text CV as the "cv" field.');
        return;
      }

      const allowed = ['application/pdf', 'text/plain'];
      if (!allowed.includes(file.mimetype)) {
        sendError(res, 415, 'UNSUPPORTED_TYPE', 'Only PDF and plain-text files are supported.');
        return;
      }

      const parsed = await parseCvBuffer(file.buffer, file.mimetype);
      sendSuccess(res, { parsed });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'CV parsing failed';
      if (msg.includes('ANTHROPIC_API_KEY')) {
        sendError(res, 503, 'CV_PARSE_UNAVAILABLE', 'CV parsing is not available — the AI API key is not configured. Please contact your administrator or fill in the details manually.');
      } else if (msg.includes('credit balance') || msg.includes('credit') || msg.includes('billing') || msg.includes('payment')) {
        sendError(res, 503, 'CV_PARSE_UNAVAILABLE', 'CV parsing is temporarily unavailable — the AI account has insufficient credits. Please contact your administrator or fill in the details manually.');
      } else if (msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('authentication')) {
        sendError(res, 503, 'CV_PARSE_UNAVAILABLE', 'CV parsing is not available — the AI API key is invalid. Please contact your administrator or fill in the details manually.');
      } else {
        sendError(res, 500, 'CV_PARSE_ERROR', 'Failed to parse CV. The file may be corrupted, password-protected, or in an unsupported format. Please fill in the details manually.');
      }
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

  // GET /candidates/:id/notes
  async getNotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const notes = await candidatesService.getNotes(req.params.id);
      sendSuccess(res, { notes });
    } catch { sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch notes'); }
  },

  // POST /candidates/:id/notes
  async createNote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { content, applicationId } = req.body as { content: string; applicationId?: string };
      if (!content?.trim()) { sendError(res, 400, 'INVALID_BODY', 'content is required'); return; }
      const authorName = req.user?.email ?? 'Recruiter';
      const note = await candidatesService.createNote(req.params.id, { content: content.trim(), applicationId, authorName });
      sendSuccess(res, { note }, 201);
    } catch { sendError(res, 500, 'CREATE_ERROR', 'Failed to create note'); }
  },

  // PATCH /candidates/:id/notes/:noteId
  async updateNote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { content } = req.body as { content: string };
      if (!content?.trim()) { sendError(res, 400, 'INVALID_BODY', 'content is required'); return; }
      const note = await candidatesService.updateNote(req.params.noteId, content.trim());
      if (!note) { sendError(res, 404, 'NOT_FOUND', 'Note not found'); return; }
      sendSuccess(res, { note });
    } catch { sendError(res, 500, 'UPDATE_ERROR', 'Failed to update note'); }
  },

  // DELETE /candidates/:id/notes/:noteId
  async deleteNote(req: AuthRequest, res: Response): Promise<void> {
    try {
      const ok = await candidatesService.deleteNote(req.params.noteId);
      if (!ok) { sendError(res, 404, 'NOT_FOUND', 'Note not found'); return; }
      sendSuccess(res, { deleted: true });
    } catch { sendError(res, 500, 'DELETE_ERROR', 'Failed to delete note'); }
  },

  // PATCH /candidates/:id/tags
  async updateTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tags } = req.body as { tags: string[] };
      if (!Array.isArray(tags)) { sendError(res, 400, 'INVALID_BODY', 'tags must be an array'); return; }
      const updated = await candidatesService.updateTags(req.params.id, tags);
      sendSuccess(res, { tags: updated });
    } catch { sendError(res, 500, 'UPDATE_ERROR', 'Failed to update tags'); }
  },

  // GET /candidates/:id/feed
  async getFeed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const feed = await candidatesService.getFeed(req.params.id);
      sendSuccess(res, { feed });
    } catch { sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch feed'); }
  },

  // GET /candidates/:id/feedback
  async getFeedback(req: AuthRequest, res: Response): Promise<void> {
    try {
      const feedback = await candidatesService.getFeedback(req.params.id);
      sendSuccess(res, { feedback });
    } catch { sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch feedback'); }
  },

  // GET /candidates/:id/emails
  async getEmails(req: AuthRequest, res: Response): Promise<void> {
    sendSuccess(res, { emails: [] });
  },

  // DELETE /candidates/:id
  async deleteCandidate(req: Request, res: Response): Promise<void> {
    try {
      const ok = await candidatesService.deleteCandidate(req.params.id);
      if (!ok) {
        sendError(res, 404, 'NOT_FOUND', 'Candidate not found');
        return;
      }
      sendSuccess(res, { deleted: true });
    } catch {
      sendError(res, 500, 'DELETE_ERROR', 'Failed to delete candidate');
    }
  },

  // PATCH /candidates/:id/do-not-contact
  async setDoNotContact(req: Request, res: Response): Promise<void> {
    try {
      const { doNotContact, reason, note } = req.body as { doNotContact: boolean; reason?: string; note?: string };
      if (typeof doNotContact !== 'boolean') {
        sendError(res, 400, 'INVALID_BODY', 'doNotContact must be a boolean');
        return;
      }
      const ok = await candidatesService.setDoNotContact(req.params.id, { doNotContact, reason, note });
      if (!ok) { sendError(res, 404, 'NOT_FOUND', 'Candidate not found'); return; }
      sendSuccess(res, { updated: true });
    } catch {
      sendError(res, 500, 'UPDATE_ERROR', 'Failed to update Do Not Contact status');
    }
  },

  // POST /candidates/merge
  async merge(req: Request, res: Response): Promise<void> {
    try {
      const { keepId, mergeId, fieldResolutions } = req.body as {
        keepId: string;
        mergeId: string;
        fieldResolutions: Record<string, 'keep' | 'merge'>;
      };
      if (!keepId || !mergeId) {
        sendError(res, 400, 'INVALID_BODY', 'keepId and mergeId are required');
        return;
      }
      if (keepId === mergeId) {
        sendError(res, 400, 'INVALID_BODY', 'keepId and mergeId must be different');
        return;
      }
      const ok = await candidatesService.merge(keepId, mergeId, fieldResolutions ?? {});
      if (!ok) { sendError(res, 500, 'MERGE_ERROR', 'Failed to merge profiles'); return; }
      sendSuccess(res, { merged: true, keepId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('not found')) {
        sendError(res, 404, 'NOT_FOUND', 'One or both candidates not found');
      } else {
        sendError(res, 500, 'MERGE_ERROR', 'Failed to merge profiles');
      }
    }
  },
};
