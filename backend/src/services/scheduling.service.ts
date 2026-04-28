/**
 * @file scheduling.service.ts
 * @description Slot suggestions, scheduling links, candidate self-booking,
 * reschedule, and cancel logic for interview scheduling.
 */
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { schedulingLinkRepository } from '../repositories/schedulingLink.repository';
import { interviewsRepository } from '../repositories/interviews.repository';
import { calendarIntegrationService } from './calendarIntegration.service';
import type { InterviewType } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SlotSuggestion {
  start: string; // ISO
  end: string;   // ISO
}

export interface SuggestSlotsParams {
  interviewerUserIds: string[];
  durationMinutes: number;
  bufferBefore?: number;  // minutes
  bufferAfter?: number;   // minutes
  dateRangeStart: string; // ISO date
  dateRangeEnd: string;   // ISO date
  workingHoursStart?: number; // 0–23, default 9
  workingHoursEnd?: number;   // 0–23, default 17
  timezone?: string;
  maxSlots?: number;
}

export interface CreateLinkParams {
  applicationId: string;
  interviewStageId?: string;
  durationMinutes: number;
  bufferBefore?: number;
  bufferAfter?: number;
  expiresInHours?: number; // default 72
  timezone: string;
  createdById: string;
  slots: { start: string; end: string }[];
}

export interface BookSlotParams {
  token: string;
  slotId: string;
  interviewType: InterviewType;
  meetingLink?: string;
  location?: string;
  notes?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Given a list of busy intervals and a working-hours window,
 * returns available slots of the requested duration.
 */
function findAvailableSlots(
  busyIntervals: { start: Date; end: Date }[],
  rangeStart: Date,
  rangeEnd: Date,
  durationMs: number,
  bufferBeforeMs: number,
  bufferAfterMs: number,
  workStart: number,
  workEnd: number,
  maxSlots: number,
): SlotSuggestion[] {
  // Sort busy by start
  const sorted = [...busyIntervals].sort((a, b) => a.start.getTime() - b.start.getTime());

  const slots: SlotSuggestion[] = [];
  const totalSlotMs = bufferBeforeMs + durationMs + bufferAfterMs;

  // Iterate day by day
  const cursor = new Date(rangeStart);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= rangeEnd && slots.length < maxSlots) {
    const dayStart = new Date(cursor);
    dayStart.setUTCHours(workStart, 0, 0, 0);
    const dayEnd = new Date(cursor);
    dayEnd.setUTCHours(workEnd, 0, 0, 0);

    // Skip if day is before range start or after range end
    if (dayEnd <= rangeStart || dayStart >= rangeEnd) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }

    // Skip weekends (0 = Sunday, 6 = Saturday)
    const dow = cursor.getUTCDay();
    if (dow === 0 || dow === 6) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      continue;
    }

    const effectiveStart = dayStart > rangeStart ? dayStart : rangeStart;
    const effectiveEnd = dayEnd < rangeEnd ? dayEnd : rangeEnd;

    // Get busy intervals for this day
    const dayBusy = sorted.filter(
      (b) => b.end > effectiveStart && b.start < effectiveEnd,
    );

    // Fill slots in a gap window
    function fillGap(from: number, to: number) {
      if (to - from < totalSlotMs) return;
      let slotStart = from + bufferBeforeMs;
      while (slotStart + durationMs + bufferAfterMs <= to && slots.length < maxSlots) {
        slots.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotStart + durationMs).toISOString(),
        });
        slotStart += 30 * 60 * 1000;
      }
    }

    // Find gaps between busy intervals
    let windowStart = effectiveStart.getTime();
    for (const busy of dayBusy) {
      fillGap(windowStart, busy.start.getTime());
      windowStart = Math.max(windowStart, busy.end.getTime() + bufferAfterMs);
    }

    // Gap after last busy interval
    fillGap(windowStart, effectiveEnd.getTime());

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return slots;
}

// ─── Service ────────────────────────────────────────────────────────────────

export const schedulingService = {
  /**
   * Suggest available interview slots based on interviewer calendar availability.
   */
  async suggestSlots(params: SuggestSlotsParams): Promise<SlotSuggestion[]> {
    const {
      interviewerUserIds,
      durationMinutes,
      bufferBefore = 0,
      bufferAfter = 0,
      dateRangeStart,
      dateRangeEnd,
      workingHoursStart = 9,
      workingHoursEnd = 17,
      maxSlots = 10,
    } = params;

    const timeMin = new Date(dateRangeStart);
    const timeMax = new Date(dateRangeEnd);

    // Fetch busy intervals from all interviewers' calendars
    const busyMap = await calendarIntegrationService.getFreeBusy(
      interviewerUserIds,
      timeMin,
      timeMax,
    );

    // Merge all busy intervals into a single sorted list
    const allBusy: { start: Date; end: Date }[] = [];
    for (const intervals of Object.values(busyMap)) {
      for (const b of intervals) {
        allBusy.push({ start: new Date(b.start), end: new Date(b.end) });
      }
    }

    // Merge overlapping intervals
    allBusy.sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: { start: Date; end: Date }[] = [];
    for (const interval of allBusy) {
      const last = merged[merged.length - 1];
      if (last && interval.start <= last.end) {
        last.end = interval.end > last.end ? interval.end : last.end;
      } else {
        merged.push({ ...interval });
      }
    }

    return findAvailableSlots(
      merged,
      timeMin,
      timeMax,
      durationMinutes * 60 * 1000,
      bufferBefore * 60 * 1000,
      bufferAfter * 60 * 1000,
      workingHoursStart,
      workingHoursEnd,
      maxSlots,
    );
  },

  /**
   * Create a scheduling link with pre-selected time slots for candidate self-booking.
   */
  async createSchedulingLink(params: CreateLinkParams) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + (params.expiresInHours ?? 72) * 60 * 60 * 1000);

    const link = await schedulingLinkRepository.create({
      applicationId: params.applicationId,
      interviewStageId: params.interviewStageId,
      token,
      durationMinutes: params.durationMinutes,
      bufferBefore: params.bufferBefore ?? 0,
      bufferAfter: params.bufferAfter ?? 0,
      expiresAt,
      timezone: params.timezone,
      createdById: params.createdById,
    });

    // Create slots and re-fetch in one step only if there are slots
    if (params.slots.length > 0) {
      await schedulingLinkRepository.createSlots(
        link.id,
        params.slots.map((s) => ({
          startTime: new Date(s.start),
          endTime: new Date(s.end),
        })),
      );
      // Re-fetch to include the created slots
      return (await schedulingLinkRepository.findByToken(token))!;
    }

    return link;
  },

  /**
   * Get scheduling link details by token (for the public self-scheduling page).
   */
  async getSchedulingLink(token: string) {
    const link = await schedulingLinkRepository.findByToken(token);
    if (!link) return null;

    // Check if expired or already used
    const now = new Date();
    const isExpired = link.expiresAt < now;
    const isUsed = link.usedAt !== null;

    return {
      id: link.id,
      candidateName: `${link.application.candidate.firstName} ${link.application.candidate.lastName}`,
      jobTitle: link.application.jobPosting.title,
      durationMinutes: link.durationMinutes,
      timezone: link.timezone,
      isExpired,
      isUsed,
      createdBy: `${link.createdBy.firstName} ${link.createdBy.lastName}`,
      slots: link.slots
        .filter((s) => !s.isBooked)
        .map((s) => ({
          id: s.id,
          start: s.startTime.toISOString(),
          end: s.endTime.toISOString(),
        })),
    };
  },

  /**
   * Candidate books a slot — creates the interview and marks the link/slot as used.
   */
  async bookSlot(params: BookSlotParams) {
    // Pre-validate outside transaction to return clear error codes
    const link = await schedulingLinkRepository.findByToken(params.token);
    if (!link) {
      throw Object.assign(new Error('Scheduling link not found'), { code: 'LINK_NOT_FOUND' });
    }
    if (link.usedAt) {
      throw Object.assign(new Error('This scheduling link has already been used'), { code: 'LINK_USED' });
    }
    if (link.expiresAt < new Date()) {
      throw Object.assign(new Error('This scheduling link has expired'), { code: 'LINK_EXPIRED' });
    }

    const slot = link.slots.find((s) => s.id === params.slotId);
    if (!slot) {
      throw Object.assign(new Error('Slot not found'), { code: 'SLOT_NOT_FOUND' });
    }
    if (slot.isBooked) {
      throw Object.assign(new Error('This slot is no longer available'), { code: 'SLOT_BOOKED' });
    }

    // Atomic: claim slot + create interview in a transaction
    return prisma.$transaction(async (tx) => {
      // Atomically mark slot booked — fails if another request got there first
      const updated = await tx.schedulingLinkSlot.updateMany({
        where: { id: params.slotId, isBooked: false },
        data: { isBooked: true },
      });
      if (updated.count === 0) {
        throw Object.assign(new Error('This slot is no longer available'), { code: 'SLOT_BOOKED' });
      }

      await tx.schedulingLink.update({
        where: { id: link.id },
        data: { usedAt: new Date() },
      });

      return interviewsRepository.create({
        applicationId: link.applicationId,
        type: params.interviewType,
        scheduledAt: slot.startTime,
        duration: link.durationMinutes,
        meetingLink: params.meetingLink ?? null,
        location: params.location ?? null,
        notes: params.notes,
      });
    });
  },

  /**
   * Reschedule an existing interview — updates the time, optionally other fields.
   */
  async rescheduleInterview(interviewId: string, data: {
    scheduledAt: string;
    duration?: number;
    meetingLink?: string | null;
    location?: string | null;
    notes?: string;
    reason?: string;
  }) {
    const existing = await interviewsRepository.findById(interviewId);
    if (!existing) {
      throw Object.assign(new Error('Interview not found'), { code: 'NOT_FOUND' });
    }
    if (existing.status === 'CANCELLED') {
      throw Object.assign(new Error('Cannot reschedule a cancelled interview'), { code: 'ALREADY_CANCELLED' });
    }

    const updateData: Parameters<typeof interviewsRepository.update>[1] = {
      scheduledAt: new Date(data.scheduledAt),
      status: 'SCHEDULED',
    };
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.meetingLink !== undefined) updateData.meetingLink = data.meetingLink;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return interviewsRepository.update(interviewId, updateData);
  },

  /**
   * Cancel an interview with an optional reason.
   */
  async cancelInterview(interviewId: string, reason?: string) {
    const existing = await interviewsRepository.findById(interviewId);
    if (!existing) {
      throw Object.assign(new Error('Interview not found'), { code: 'NOT_FOUND' });
    }
    if (existing.status === 'CANCELLED') {
      throw Object.assign(new Error('Interview is already cancelled'), { code: 'ALREADY_CANCELLED' });
    }

    const updateData: Parameters<typeof interviewsRepository.update>[1] = {
      status: 'CANCELLED',
    };
    if (reason) updateData.notes = `${existing.notes ? existing.notes + '\n' : ''}Cancellation reason: ${reason}`;

    return interviewsRepository.update(interviewId, updateData);
  },
};
