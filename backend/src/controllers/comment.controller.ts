/**
 * @file comment.controller.ts
 * @description REST endpoints for candidate comments.
 *
 * GET    /api/candidates/:candidateId/comments
 * POST   /api/candidates/:candidateId/comments
 * DELETE /api/candidates/:candidateId/comments/:commentId
 */
import type { Response } from 'express';
import type { AuthRequest } from '../types';
import { commentService } from '../services/comment.service';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const CreateCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  applicationId: z.string().optional(),
});

export const commentController = {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { candidateId } = req.params;
      const applicationId = req.query.applicationId as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20));

      const result = await commentService.getComments(candidateId, applicationId, page, pageSize);
      sendSuccess(res, { comments: result.comments, total: result.total, page, pageSize });
    } catch {
      sendError(res, 500, 'FETCH_ERROR', 'Failed to fetch comments');
    }
  },

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      if (!userId || !role) {
        sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      const parsed = CreateCommentSchema.safeParse(req.body);
      if (!parsed.success) {
        const details = parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        sendError(res, 422, 'VALIDATION_ERROR', 'Request validation failed', details);
        return;
      }

      const { candidateId } = req.params;
      const comment = await commentService.addComment({
        candidateId,
        applicationId: parsed.data.applicationId,
        authorId: userId,
        body: parsed.data.body,
        authorRole: role,
      });

      sendSuccess(res, { comment }, 201);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'FORBIDDEN') {
        sendError(res, 403, 'FORBIDDEN', (err as Error).message);
      } else {
        sendError(res, 500, 'CREATE_ERROR', 'Failed to create comment');
      }
    }
  },

  async remove(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      if (!userId || !role) {
        sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      const { commentId } = req.params;
      await commentService.deleteComment(commentId, userId, role);

      sendSuccess(res, { deleted: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'NOT_FOUND') {
        sendError(res, 404, 'NOT_FOUND', (err as Error).message);
      } else if (code === 'FORBIDDEN') {
        sendError(res, 403, 'FORBIDDEN', (err as Error).message);
      } else if (code === 'ALREADY_DELETED') {
        sendError(res, 409, 'ALREADY_DELETED', (err as Error).message);
      } else {
        sendError(res, 500, 'DELETE_ERROR', 'Failed to delete comment');
      }
    }
  },
};
