/**
 * @file scheduling.controller.ts
 * @description Interview scheduling endpoints — slot suggestions, link creation,
 * candidate self-booking, reschedule, and cancel.
 *
 * Public endpoints (no auth): GET /public/:token, POST /public/:token/book
 * Authenticated endpoints: POST /suggest-slots, POST /links, GET /links/:applicationId,
 *   PUT /interviews/:id/reschedule, DELETE /interviews/:id
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
  bufferBefore: z.number().int().min(0).max(60),
  bufferAfter: z.number().int().min(0).max(60),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  timezone: z.string().min(1),
});

const CreateLinkSchema = z.object({
  applicationId: z.string().min(1),
  interviewerUserIds: z.array(z.string().min(1)).min(1).max(20),
  durationMinutes: z.number().int().min(15).max(480),
  bufferBefore: z.number().int().min(0).max(60),
  bufferAfter: z.number().int().min(0).max(60),
  expiresInHours: z.number().int().min(1).max(720),
  timezone: z.string().min(1),
});

const BookSlotSchema = z.object({
  slotId: z.string().min(1),
});

const RescheduleSchema = z.object({
  newStart: z.string().datetime(),
  newEnd: z.string().datetime(),
});

const CancelSchema = z.object({
  reason: z.string().optional(),
});

// ─── Validation helper ──────────────────────────────────────────────────────

function zodValidate<T>(schema: z.ZodSchema<T>, data: unknown, res: Response): T | null {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
    return null;
  }
  return parsed.data;
}

// ─── Controller ─────────────────────────────────────────────────────────────

export const schedulingController = {
  /** POST /api/scheduling/suggest-slots */
  async suggestSlots(req: AuthRequest, res: Response): Promise<void> {
    try {
      const body = zodValidate(SuggestSlotsSchema, req.body, res);
      if (!body) return;

      const result = await schedulingService.suggestSlots({
        ...body,
        windowStart: new Date(body.windowStart),
        windowEnd: new Date(body.windowEnd),
      });

      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'SUGGEST_SLOTS_ERROR', 'Failed to suggest interview slots');
    }
  },

  /** POST /api/scheduling/links */
  async createLink(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }

      const body = zodValidate(CreateLinkSchema, req.body, res);
      if (!body) return;

      const link = await schedulingService.createSchedulingLink({
        ...body,
        createdById: userId,
      });

      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      sendSuccess(res, {
        id: link.id,
        token: link.token,
        url: `${frontendUrl}/schedule/${link.token}`,
        expiresAt: link.expiresAt.toISOString(),
        durationMinutes: link.durationMinutes,
        timezone: link.timezone,
        slots: link.slots.map((s) => ({
          id: s.id,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
        })),
      }, 201);
    } catch {
      sendError(res, 500, 'CREATE_LINK_ERROR', 'Failed to create scheduling link');
    }
  },

  /** GET /api/scheduling/links/:applicationId */
  async getLinksByApplication(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { applicationId } = req.params;
      const links = await schedulingService.getLinksByApplication(applicationId);
      sendSuccess(res, { links });
    } catch {
      sendError(res, 500, 'FETCH_LINKS_ERROR', 'Failed to fetch scheduling links');
    }
  },

  /** GET /api/scheduling/public/:token — public, no auth, no PII */
  async getPublicLink(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const link = await schedulingService.getPublicLink(token);

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

      // Strip internal flags before sending
      const { isExpired: _e, isUsed: _u, ...safeData } = link;
      sendSuccess(res, safeData);
    } catch {
      sendError(res, 500, 'FETCH_LINK_ERROR', 'Failed to fetch scheduling link');
    }
  },

  /** POST /api/scheduling/public/:token/book — public, no auth, idempotent-safe */
  async bookSlot(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const body = zodValidate(BookSlotSchema, req.body, res);
      if (!body) return;

      await schedulingService.bookSlot(token, body.slotId);

      sendSuccess(res, { message: 'Interview scheduled' }, 201);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'LINK_NOT_FOUND' || code === 'SLOT_NOT_FOUND') {
        sendError(res, 404, code, (err as Error).message);
      } else if (code === 'LINK_ALREADY_USED' || code === 'SLOT_ALREADY_BOOKED') {
        sendError(res, 409, code, (err as Error).message);
      } else if (code === 'LINK_EXPIRED') {
        sendError(res, 410, code, (err as Error).message);
      } else {
        sendError(res, 500, 'BOOK_SLOT_ERROR', 'Failed to book interview slot');
      }
    }
  },

  /** PUT /api/scheduling/interviews/:id/reschedule */
  async reschedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }

      const { id } = req.params;
      const body = zodValidate(RescheduleSchema, req.body, res);
      if (!body) return;

      const interview = await schedulingService.rescheduleInterview(
        id,
        new Date(body.newStart),
        new Date(body.newEnd),
        userId,
      );

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
      } else if (code === 'FORBIDDEN') {
        sendError(res, 403, code, (err as Error).message);
      } else {
        sendError(res, 500, 'RESCHEDULE_ERROR', 'Failed to reschedule interview');
      }
    }
  },

  /** DELETE /api/scheduling/interviews/:id */
  async cancel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }

      const { id } = req.params;
      const body = zodValidate(CancelSchema, req.body ?? {}, res);
      if (!body) return;

      await schedulingService.cancelInterview(id, body.reason, userId);

      sendSuccess(res, { message: 'Interview cancelled' });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'NOT_FOUND') {
        sendError(res, 404, code, (err as Error).message);
      } else if (code === 'ALREADY_CANCELLED') {
        sendError(res, 409, code, (err as Error).message);
      } else if (code === 'FORBIDDEN') {
        sendError(res, 403, code, (err as Error).message);
      } else {
        sendError(res, 500, 'CANCEL_ERROR', 'Failed to cancel interview');
      }
    }
  },
};
