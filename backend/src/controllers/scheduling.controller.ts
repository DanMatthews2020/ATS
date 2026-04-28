/**
 * @file scheduling.controller.ts
 * @description Interview scheduling endpoints — slot suggestions, link creation,
 * candidate self-booking, reschedule, and cancel.
 *
 * Public endpoints (no auth): getSchedulingLink, bookSlot
 * Authenticated endpoints: suggestSlots, createLink, reschedule, cancel
 */
import type { Request, Response } from 'express';
import type { AuthRequest } from '../types';
import { schedulingService } from '../services/scheduling.service';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

// ─── Zod schemas ────────────────────────────────────────────────────────────

const SuggestSlotsSchema = z.object({
  interviewerUserIds: z.array(z.string().min(1)).min(1).max(20),
  durationMinutes: z.number().int().min(15).max(480),
  bufferBefore: z.number().int().min(0).max(60).optional(),
  bufferAfter: z.number().int().min(0).max(60).optional(),
  dateRangeStart: z.string().datetime(),
  dateRangeEnd: z.string().datetime(),
  workingHoursStart: z.number().int().min(0).max(23).optional(),
  workingHoursEnd: z.number().int().min(0).max(23).optional(),
  maxSlots: z.number().int().min(1).max(50).optional(),
});

const CreateLinkSchema = z.object({
  applicationId: z.string().min(1),
  interviewStageId: z.string().min(1).optional(),
  durationMinutes: z.number().int().min(15).max(480),
  bufferBefore: z.number().int().min(0).max(60).optional(),
  bufferAfter: z.number().int().min(0).max(60).optional(),
  expiresInHours: z.number().int().min(1).max(720).optional(),
  timezone: z.string().min(1),
  slots: z.array(z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  })).min(1).max(50),
});

const BookSlotSchema = z.object({
  slotId: z.string().min(1),
  interviewType: z.enum(['PHONE', 'VIDEO', 'ON_SITE', 'TECHNICAL']),
  meetingLink: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const RescheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
  duration: z.number().int().min(15).max(480).optional(),
  meetingLink: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
});

const CancelSchema = z.object({
  reason: z.string().optional(),
});

// ─── Controller ─────────────────────────────────────────────────────────────

export const schedulingController = {
  /** POST /api/scheduling/suggest-slots — suggest available interview slots */
  async suggestSlots(req: AuthRequest, res: Response): Promise<void> {
    try {
      const parsed = SuggestSlotsSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        return;
      }

      const slots = await schedulingService.suggestSlots(parsed.data);
      sendSuccess(res, { slots });
    } catch {
      sendError(res, 500, 'SUGGEST_SLOTS_ERROR', 'Failed to suggest interview slots');
    }
  },

  /** POST /api/scheduling/links — create a scheduling link */
  async createLink(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }

      const parsed = CreateLinkSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        return;
      }

      const link = await schedulingService.createSchedulingLink({
        ...parsed.data,
        createdById: userId,
      });

      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      sendSuccess(res, {
        id: link.id,
        token: link.token,
        url: `${frontendUrl}/schedule/${link.token}`,
        expiresAt: link.expiresAt.toISOString(),
        slots: link.slots.map((s) => ({
          id: s.id,
          start: s.startTime.toISOString(),
          end: s.endTime.toISOString(),
        })),
      }, 201);
    } catch {
      sendError(res, 500, 'CREATE_LINK_ERROR', 'Failed to create scheduling link');
    }
  },

  /** GET /api/scheduling/links/:token — public: get link details for self-booking page */
  async getLink(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const link = await schedulingService.getSchedulingLink(token);

      if (!link) {
        sendError(res, 404, 'NOT_FOUND', 'Scheduling link not found');
        return;
      }

      if (link.isExpired) {
        sendError(res, 410, 'LINK_EXPIRED', 'This scheduling link has expired');
        return;
      }

      if (link.isUsed) {
        sendError(res, 410, 'LINK_USED', 'This scheduling link has already been used');
        return;
      }

      sendSuccess(res, link);
    } catch {
      sendError(res, 500, 'FETCH_LINK_ERROR', 'Failed to fetch scheduling link');
    }
  },

  /** POST /api/scheduling/links/:token/book — public: candidate books a slot */
  async bookSlot(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const parsed = BookSlotSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        return;
      }

      const interview = await schedulingService.bookSlot({
        token,
        ...parsed.data,
      });

      sendSuccess(res, {
        interviewId: interview.id,
        scheduledAt: interview.scheduledAt.toISOString(),
        duration: interview.duration,
      }, 201);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'LINK_NOT_FOUND' || code === 'SLOT_NOT_FOUND') {
        sendError(res, 404, code, (err as Error).message);
      } else if (code === 'LINK_USED' || code === 'LINK_EXPIRED' || code === 'SLOT_BOOKED') {
        sendError(res, 410, code, (err as Error).message);
      } else {
        sendError(res, 500, 'BOOK_SLOT_ERROR', 'Failed to book interview slot');
      }
    }
  },

  /** PATCH /api/scheduling/interviews/:id/reschedule — reschedule an interview */
  async reschedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = RescheduleSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        return;
      }

      const interview = await schedulingService.rescheduleInterview(id, parsed.data);
      sendSuccess(res, {
        id: interview.id,
        scheduledAt: interview.scheduledAt.toISOString(),
        duration: interview.duration,
        status: interview.status,
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'NOT_FOUND') {
        sendError(res, 404, code, (err as Error).message);
      } else if (code === 'ALREADY_CANCELLED') {
        sendError(res, 409, code, (err as Error).message);
      } else {
        sendError(res, 500, 'RESCHEDULE_ERROR', 'Failed to reschedule interview');
      }
    }
  },

  /** PATCH /api/scheduling/interviews/:id/cancel — cancel an interview */
  async cancel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = CancelSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        return;
      }

      const interview = await schedulingService.cancelInterview(id, parsed.data.reason);
      sendSuccess(res, {
        id: interview.id,
        status: interview.status,
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'NOT_FOUND') {
        sendError(res, 404, code, (err as Error).message);
      } else if (code === 'ALREADY_CANCELLED') {
        sendError(res, 409, code, (err as Error).message);
      } else {
        sendError(res, 500, 'CANCEL_ERROR', 'Failed to cancel interview');
      }
    }
  },
};
