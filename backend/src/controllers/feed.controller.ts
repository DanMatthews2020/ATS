/**
 * @file feed.controller.ts
 * @description Public endpoints for the job feed and external applications.
 *
 * These routes do NOT require authentication — they're designed to be
 * consumed by external career pages, embed widgets, and job boards.
 */
import type { Request, Response } from 'express';
import { feedService } from '../services/feed.service';
import { prisma } from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';

export const feedController = {
  /** GET /api/jobs/feed — public JSON feed of open positions */
  async getJobFeed(_req: Request, res: Response): Promise<void> {
    try {
      const feed = await feedService.getOpenJobs();
      sendSuccess(res, feed);
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch job feed');
    }
  },

  /** GET /api/jobs/:jobId/public — public single-job details for the apply page */
  async getPublicJob(req: Request, res: Response): Promise<void> {
    try {
      const job = await feedService.getOpenJobById(req.params.jobId);
      if (!job) {
        sendError(res, 404, 'NOT_FOUND', 'Job not found or no longer accepting applications');
        return;
      }
      sendSuccess(res, { job });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch job details');
    }
  },

  /** POST /api/jobs/:jobId/apply — public application submission */
  async submitApplication(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { firstName, lastName, email, phone, resumeUrl, coverLetter } = req.body as {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        resumeUrl?: string;
        coverLetter?: string;
      };

      // Validate required fields
      if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
        sendError(res, 400, 'INVALID_BODY', 'firstName, lastName, and email are required');
        return;
      }

      // Verify job exists and is open
      const job = await prisma.jobPosting.findFirst({
        where: { id: jobId, status: 'OPEN' },
        select: { id: true, title: true },
      });
      if (!job) {
        sendError(res, 404, 'NOT_FOUND', 'Job not found or no longer accepting applications');
        return;
      }

      // Upsert candidate — if they already exist (by email), update; otherwise create
      const candidate = await prisma.candidate.upsert({
        where: { email: email.trim().toLowerCase() },
        update: {
          phone: phone ?? undefined,
          cvUrl: resumeUrl ?? undefined,
        },
        create: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ?? null,
          cvUrl: resumeUrl ?? null,
          source: 'EXTERNAL_WEBSITE',
        },
      });

      // Create the application (unique constraint on candidateId+jobPostingId)
      const application = await prisma.application.create({
        data: {
          candidateId: candidate.id,
          jobPostingId: jobId,
          status: 'APPLIED',
          notes: coverLetter ?? null,
        },
      });

      sendSuccess(res, {
        message: 'Application submitted successfully',
        applicationId: application.id,
        jobTitle: job.title,
      }, 201);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === 'P2002') {
        sendError(res, 409, 'ALREADY_APPLIED', 'You have already applied to this position');
        return;
      }
      sendError(res, 500, 'SUBMIT_ERROR', 'Failed to submit application');
    }
  },
};
