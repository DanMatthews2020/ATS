import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { isServiceError } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import { gmailService } from '../services/gmail.service';
import { gmailRepository } from '../repositories/gmail.repository';
import { emailTemplatesService } from '../services/email-templates.service';
import { z } from 'zod';

// ── Zod schemas ──────────────────────────────────────────────────────────────

const SendEmailSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  bodyHtml: z.string().min(1, 'HTML body is required'),
  bodyText: z.string().min(1, 'Text body is required'),
  replyToThreadId: z.string().optional(),
  templateId: z.string().optional(),
});

// ── Controller ───────────────────────────────────────────────────────────────

export const gmailController = {
  /** GET /api/candidates/:candidateId/emails */
  async getThreads(req: AuthRequest, res: Response) {
    try {
      const { candidateId } = req.params;
      const threads = await gmailRepository.findThreadsByCandidate(candidateId);
      return sendSuccess(res, { threads });
    } catch (err) {
      if (isServiceError(err)) return sendError(res, err.statusCode, err.code, err.message);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch email threads');
    }
  },

  /** POST /api/candidates/:candidateId/emails/sync */
  async syncCandidate(req: AuthRequest, res: Response) {
    try {
      const { candidateId } = req.params;
      const recruiterId = req.user!.userId;

      // Get candidate email
      const { prisma } = await import('../lib/prisma');
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId, deletedAt: null },
        select: { email: true },
      });
      if (!candidate) return sendError(res, 404, 'NOT_FOUND', 'Candidate not found');

      const result = await gmailService.syncCandidateThreads({
        recruiterId,
        candidateId,
        candidateEmail: candidate.email,
        fullSync: false,
      });

      return sendSuccess(res, {
        ...result,
        syncedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (isServiceError(err)) return sendError(res, err.statusCode, err.code, err.message);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to sync emails');
    }
  },

  /** POST /api/candidates/:candidateId/emails/send */
  async sendEmail(req: AuthRequest, res: Response) {
    try {
      const parsed = SendEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request body', parsed.error.flatten().fieldErrors);
      }

      const { candidateId } = req.params;
      const recruiterId = req.user!.userId;
      let { subject, bodyHtml, bodyText, replyToThreadId, templateId } = parsed.data;

      // Get candidate email
      const { prisma } = await import('../lib/prisma');
      const candidate = await prisma.candidate.findUnique({
        where: { id: candidateId, deletedAt: null },
        select: { email: true, firstName: true, lastName: true },
      });
      if (!candidate) return sendError(res, 404, 'NOT_FOUND', 'Candidate not found');

      // If templateId provided, render template with candidate variables
      if (templateId) {
        const template = await emailTemplatesService.getById(templateId);
        if (template) {
          const vars: Record<string, string> = {
            '{{candidateFirstName}}': candidate.firstName,
            '{{candidateLastName}}': candidate.lastName,
            '{{candidateName}}': `${candidate.firstName} ${candidate.lastName}`,
            '{{candidateEmail}}': candidate.email,
          };
          subject = template.subject;
          bodyHtml = template.body;
          bodyText = template.body.replace(/<[^>]+>/g, '');
          for (const [key, val] of Object.entries(vars)) {
            subject = subject.split(key).join(val);
            bodyHtml = bodyHtml.split(key).join(val);
            bodyText = bodyText.split(key).join(val);
          }
        }
      }

      const message = await gmailService.sendEmail({
        recruiterId,
        candidateId,
        to: candidate.email,
        subject,
        bodyHtml,
        bodyText,
        replyToThreadId,
      });

      return sendSuccess(res, { message }, 201);
    } catch (err) {
      if (isServiceError(err)) return sendError(res, err.statusCode, err.code, err.message);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to send email');
    }
  },

  /** GET /api/gmail/status */
  async getStatus(req: AuthRequest, res: Response) {
    try {
      const status = await gmailService.getGmailStatus(req.user!.userId);
      return sendSuccess(res, status);
    } catch (err) {
      if (isServiceError(err)) return sendError(res, err.statusCode, err.code, err.message);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to get Gmail status');
    }
  },

  /** GET /api/gmail/connect */
  async getConnectUrl(req: AuthRequest, res: Response) {
    try {
      const url = await gmailService.getGmailConnectUrl(req.user!.userId);
      return sendSuccess(res, { url });
    } catch (err) {
      if (isServiceError(err)) return sendError(res, err.statusCode, err.code, err.message);
      return sendError(res, 500, 'INTERNAL_ERROR', 'Failed to generate connect URL');
    }
  },
};
