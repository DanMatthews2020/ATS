/**
 * @file feed.routes.ts
 * @description Public routes — NO authentication required.
 *
 * GET  /api/feed              → JSON feed of all open jobs
 * GET  /api/feed/jobs/:jobId  → Public single-job details
 * POST /api/feed/jobs/:jobId/apply → External application submission
 */
import { Router } from 'express';
import { feedController } from '../controllers/feed.controller';

const router = Router();

router.get('/',                    feedController.getJobFeed);
router.get('/jobs/:jobId',         feedController.getPublicJob);
router.post('/jobs/:jobId/apply',  feedController.submitApplication);

export default router;
