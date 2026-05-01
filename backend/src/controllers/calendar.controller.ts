/**
 * @file calendar.controller.ts
 * @description Google Calendar OAuth + event CRUD endpoints.
 *
 * All responses use sendSuccess() / sendError() — no raw res.json().
 * The callback endpoint is unauthenticated (OAuth redirect from Google).
 */
import type { Request, Response } from 'express';
import type { AuthRequest } from '../types';
import { calendarIntegrationService } from '../services/calendarIntegration.service';
import { calendarService } from '../services/calendar.service';
import { sendSuccess, sendError } from '../utils/response';
import { isServiceError } from '../types';
import { z } from 'zod';

// ─── Zod schemas ────────────────────────────────────────────────────────────

export const FreeBusySchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(20),
  timeMin: z.string().datetime(),
  timeMax: z.string().datetime(),
  timezone: z.string().optional().default('UTC'),
});

const CreateEventSchema = z.object({
  interviewId: z.string().min(1),
  attendeeEmails: z.array(z.string().email()).default([]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().optional().default('UTC'),
  addMeetLink: z.boolean().optional().default(true),
});

const UpdateEventSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

// ─── Controller ─────────────────────────────────────────────────────────────

export const calendarController = {
  /** GET /api/calendar/auth-url — generate Google OAuth URL */
  async getAuthUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }
      const url = calendarIntegrationService.generateGoogleAuthUrl(userId);
      sendSuccess(res, { url });
    } catch {
      sendError(res, 500, 'AUTH_URL_ERROR', 'Failed to generate Google auth URL');
    }
  },

  /** GET /api/calendar/callback — Google OAuth redirect (no auth) */
  async handleCallback(req: Request, res: Response): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const redirectBase = `${frontendUrl}/settings/calendar`;

    try {
      const { code, state, error } = req.query as Record<string, string | undefined>;

      if (error) {
        res.redirect(`${redirectBase}?error=${encodeURIComponent(error)}`);
        return;
      }

      if (!code || !state) {
        res.redirect(`${redirectBase}?error=missing_params`);
        return;
      }

      await calendarIntegrationService.handleGoogleCallback(code, state);
      res.redirect(`${redirectBase}?connected=true`);
    } catch (err: unknown) {
      const errCode = (err as { code?: string })?.code ?? 'callback_failed';
      res.redirect(`${redirectBase}?error=${encodeURIComponent(errCode)}`);
    }
  },

  /** GET /api/calendar/status — check connection status */
  async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }
      const status = await calendarIntegrationService.getCalendarStatus(userId);
      sendSuccess(res, status);
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch calendar status');
    }
  },

  /** DELETE /api/calendar/disconnect — revoke and deactivate */
  async disconnect(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }
      await calendarIntegrationService.disconnectCalendar(userId);
      sendSuccess(res, { disconnected: true });
    } catch {
      sendError(res, 500, 'DISCONNECT_ERROR', 'Failed to disconnect calendar');
    }
  },

  /** POST /api/calendar/free-busy — query free/busy for users */
  async getFreeBusy(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }

      const parsed = FreeBusySchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        return;
      }

      const { userIds, timeMin, timeMax, timezone } = parsed.data;
      const result = await calendarService.getFreeBusy({
        userIds,
        timeMin: new Date(timeMin),
        timeMax: new Date(timeMax),
        timezone,
      });
      sendSuccess(res, result);
    } catch {
      sendError(res, 500, 'FREEBUSY_ERROR', 'Failed to fetch free/busy data');
    }
  },

  /** GET /api/calendar/connect — get incremental OAuth URL for calendar scope */
  async getConnectUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }
      const url = await calendarService.getCalendarConnectUrl(userId);
      sendSuccess(res, { url });
    } catch {
      sendError(res, 500, 'CONNECT_ERROR', 'Failed to generate connect URL');
    }
  },

  /** POST /api/calendar/events — create a Google Calendar event */
  async createEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }

      const parsed = CreateEventSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        return;
      }

      const { interviewId, attendeeEmails, startTime, endTime, timezone, addMeetLink } = parsed.data;

      // Look up the interview for title/description
      const interview = await (await import('../lib/prisma')).prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
          application: {
            include: {
              candidate: { select: { firstName: true, lastName: true } },
              jobPosting: { select: { title: true } },
            },
          },
        },
      });

      if (!interview) {
        sendError(res, 404, 'INTERVIEW_NOT_FOUND', 'Interview not found');
        return;
      }

      const candidateName = `${interview.application.candidate.firstName} ${interview.application.candidate.lastName}`;
      const jobTitle = interview.application.jobPosting.title;

      const result = await calendarService.createEvent({
        userId,
        interviewId,
        title: `Interview: ${candidateName} — ${jobTitle}`,
        description: `Candidate: ${candidateName}\nJob: ${jobTitle}\nDuration: ${interview.duration} min`,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        attendeeEmails,
        timezone,
        addMeetLink,
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      if (isServiceError(err)) {
        sendError(res, err.statusCode, err.code, err.message);
      } else {
        sendError(res, 500, 'EVENT_CREATE_ERROR', 'Failed to create calendar event');
      }
    }
  },

  /** PUT /api/calendar/events/:eventId — update a Google Calendar event */
  async updateEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }

      const parsed = UpdateEventSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
        sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        return;
      }

      await calendarService.updateEvent({
        userId,
        eventId: req.params.eventId,
        startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : undefined,
        endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : undefined,
        title: parsed.data.title,
        description: parsed.data.description,
      });

      sendSuccess(res, { updated: true });
    } catch (err) {
      if (isServiceError(err)) {
        sendError(res, err.statusCode, err.code, err.message);
      } else {
        sendError(res, 500, 'EVENT_UPDATE_ERROR', 'Failed to update calendar event');
      }
    }
  },

  /** DELETE /api/calendar/events/:eventId — cancel a Google Calendar event */
  async cancelEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) { sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'); return; }

      await calendarService.cancelEvent(userId, req.params.eventId);
      sendSuccess(res, { cancelled: true });
    } catch (err) {
      if (isServiceError(err)) {
        sendError(res, err.statusCode, err.code, err.message);
      } else {
        sendError(res, 500, 'EVENT_CANCEL_ERROR', 'Failed to cancel calendar event');
      }
    }
  },
};
