/**
 * @file calendar.service.ts
 * @description Google Calendar sync — connect, free/busy, create/update/cancel events,
 * Google Meet auto-generation, and auto-connect on SSO login.
 *
 * All Google API calls go through googleApiClient.getCalendarClient(userId),
 * which handles token management via the GoogleWorkspaceConnection layer.
 * This service never manages tokens directly.
 */
import { prisma } from '../lib/prisma';
import { getCalendarClient } from '../utils/googleApiClient';
import { googleWorkspaceService } from './googleWorkspace.service';
import { calendarIntegrationRepository } from '../repositories/calendarIntegration.repository';
import { GOOGLE_SCOPES, SCOPE_SETS } from '../config/googleScopes';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BusyInterval {
  start: string;
  end: string;
}

export interface FreeBusyResult {
  busySlots: Record<string, BusyInterval[]>;
  warnings: string[];
}

export interface CreateEventParams {
  userId: string;
  interviewId: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendeeEmails: string[];
  timezone: string;
  addMeetLink: boolean;
}

export interface CreateEventResult {
  eventId: string;
  meetLink?: string;
}

export interface UpdateEventParams {
  userId: string;
  eventId: string;
  startTime?: Date;
  endTime?: Date;
  title?: string;
  description?: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

export const calendarService = {
  /**
   * Check if a user has Google Calendar connected via workspace scopes.
   */
  async isCalendarConnected(userId: string): Promise<boolean> {
    return googleWorkspaceService.hasGrantedScopes(userId, [GOOGLE_SCOPES.CALENDAR_EVENTS]);
  },

  /**
   * Get the Google OAuth URL to add calendar scopes (incremental auth).
   * The user is redirected to Google to grant calendar permissions.
   */
  async getCalendarConnectUrl(userId: string): Promise<string> {
    // Import lazily to avoid circular dependency
    const { googleAuthService } = await import('./googleAuth.service');
    return googleAuthService.generateAuthUrl('/settings/calendar?connected=true');
  },

  /**
   * Fetch the user's primary Google Calendar ID.
   * Stores it on CalendarIntegration for fast access.
   */
  async getPrimaryCalendarId(userId: string): Promise<string> {
    // Check if we already have it cached
    const existing = await calendarIntegrationRepository.findStatusByUserId(userId);
    if (existing?.calendarId && existing.isActive) {
      return existing.calendarId;
    }

    const cal = await getCalendarClient(userId);
    const { data } = await cal.calendars.get({ calendarId: 'primary' });
    const calendarId = data.id ?? 'primary';

    // Upsert to CalendarIntegration for fast access
    // Get the workspace connection for token data
    const workspace = await prisma.googleWorkspaceConnection.findUnique({
      where: { userId },
      select: { accessToken: true, refreshToken: true, tokenExpiry: true },
    });

    if (workspace) {
      await calendarIntegrationRepository.upsert(userId, {
        provider: 'GOOGLE',
        accessToken: workspace.accessToken,
        refreshToken: workspace.refreshToken,
        tokenExpiry: workspace.tokenExpiry,
        calendarId,
        isActive: true,
      });
    }

    return calendarId;
  },

  /**
   * Query Google Calendar free/busy for multiple users.
   * Degrades gracefully — users without calendar connected get empty arrays + a warning.
   */
  async getFreeBusy(params: {
    userIds: string[];
    timeMin: Date;
    timeMax: Date;
    timezone: string;
  }): Promise<FreeBusyResult> {
    const busySlots: Record<string, BusyInterval[]> = {};
    const warnings: string[] = [];

    const results = await Promise.all(
      params.userIds.map(async (userId) => {
        const connected = await calendarService.isCalendarConnected(userId);
        if (!connected) {
          return { userId, busy: [] as BusyInterval[], warning: true };
        }

        try {
          const cal = await getCalendarClient(userId);
          const calendarId = await calendarService.getPrimaryCalendarId(userId);

          const { data } = await cal.freebusy.query({
            requestBody: {
              timeMin: params.timeMin.toISOString(),
              timeMax: params.timeMax.toISOString(),
              timeZone: params.timezone,
              items: [{ id: calendarId }],
            },
          });

          const intervals = data.calendars?.[calendarId]?.busy ?? [];
          return {
            userId,
            busy: intervals.map((b) => ({
              start: b.start ?? '',
              end: b.end ?? '',
            })),
            warning: false,
          };
        } catch {
          return { userId, busy: [] as BusyInterval[], warning: true };
        }
      }),
    );

    // Collect disconnected user names for warning
    const disconnectedIds = results.filter((r) => r.warning).map((r) => r.userId);
    if (disconnectedIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: disconnectedIds } },
        select: { firstName: true, lastName: true },
      });
      const names = users.map((u) => `${u.firstName} ${u.lastName}`);
      warnings.push(
        `${names.join(', ')} ${names.length === 1 ? 'does' : 'do'} not have a calendar connected — treated as fully available`,
      );
    }

    for (const r of results) {
      busySlots[r.userId] = r.busy;
    }

    return { busySlots, warnings };
  },

  /**
   * Create a Google Calendar event with optional Google Meet link.
   * Stores the mapping in CalendarEventMapping.
   */
  async createEvent(params: CreateEventParams): Promise<CreateEventResult> {
    const cal = await getCalendarClient(params.userId);
    const calendarId = await calendarService.getPrimaryCalendarId(params.userId);

    const eventBody: Record<string, unknown> = {
      summary: params.title,
      description: params.description,
      start: { dateTime: params.startTime.toISOString(), timeZone: params.timezone },
      end: { dateTime: params.endTime.toISOString(), timeZone: params.timezone },
      attendees: params.attendeeEmails.map((email) => ({ email })),
    };

    if (params.addMeetLink) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: `tt-${params.interviewId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const { data: event } = await cal.events.insert({
      calendarId,
      requestBody: eventBody as Parameters<typeof cal.events.insert>[0] extends { requestBody?: infer R } ? R : never,
      conferenceDataVersion: params.addMeetLink ? 1 : undefined,
      sendUpdates: 'all',
    });

    const eventId = event.id ?? '';
    const meetLink = event.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video',
    )?.uri ?? undefined;

    // Store CalendarEventMapping
    await prisma.calendarEventMapping.upsert({
      where: { interviewId: params.interviewId },
      create: {
        interviewId: params.interviewId,
        externalEventId: eventId,
        provider: 'GOOGLE',
        calendarId,
      },
      update: {
        externalEventId: eventId,
        calendarId,
      },
    });

    // Store meet link on Interview record
    if (meetLink) {
      await prisma.interview.update({
        where: { id: params.interviewId },
        data: { meetingLink: meetLink },
      });
    }

    return { eventId, meetLink };
  },

  /**
   * Update an existing Google Calendar event.
   */
  async updateEvent(params: UpdateEventParams): Promise<void> {
    const mapping = await prisma.calendarEventMapping.findFirst({
      where: { externalEventId: params.eventId },
    });
    if (!mapping) return;

    const cal = await getCalendarClient(params.userId);

    const patch: Record<string, unknown> = {};
    if (params.startTime) patch.start = { dateTime: params.startTime.toISOString() };
    if (params.endTime) patch.end = { dateTime: params.endTime.toISOString() };
    if (params.title) patch.summary = params.title;
    if (params.description) patch.description = params.description;

    await cal.events.patch({
      calendarId: mapping.calendarId,
      eventId: params.eventId,
      requestBody: patch as Parameters<typeof cal.events.patch>[0] extends { requestBody?: infer R } ? R : never,
      sendUpdates: 'all',
    });
  },

  /**
   * Cancel (delete) a Google Calendar event.
   */
  async cancelEvent(userId: string, eventId: string): Promise<void> {
    const mapping = await prisma.calendarEventMapping.findFirst({
      where: { externalEventId: eventId },
    });
    if (!mapping) return;

    try {
      const cal = await getCalendarClient(userId);
      await cal.events.delete({
        calendarId: mapping.calendarId,
        eventId,
        sendUpdates: 'all',
      });
    } catch {
      // Deletion failure is non-critical — event may already be deleted
    }
  },

  /**
   * Auto-connect calendar when a user logs in via Google SSO.
   * If calendar scopes are granted, fetch and store the primary calendar ID.
   * Non-blocking — errors are logged but don't fail the login.
   */
  async autoConnectCalendarOnLogin(userId: string): Promise<void> {
    try {
      const hasCalendar = await calendarService.isCalendarConnected(userId);
      if (!hasCalendar) return;

      await calendarService.getPrimaryCalendarId(userId);
      console.log(`[calendar] Auto-connected calendar for user ${userId}`);
    } catch (err) {
      console.error(`[calendar] Auto-connect failed for user ${userId}:`, err);
    }
  },
};
