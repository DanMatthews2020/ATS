/**
 * @file comment.routes.ts
 * @description Candidate comment routes with job-access enforcement.
 *
 * GET    /api/candidates/:candidateId/comments
 * POST   /api/candidates/:candidateId/comments
 * DELETE /api/candidates/:candidateId/comments/:commentId
 */
import { Router } from 'express';
import { commentController } from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { checkCandidateAccess } from '../middleware/jobAccess.middleware';

const router = Router({ mergeParams: true });

router.get('/',              authenticate, checkCandidateAccess, commentController.list);
router.post('/',             authenticate, checkCandidateAccess, commentController.create);
router.delete('/:commentId', authenticate, checkCandidateAccess, commentController.remove);

export default router;
