/**
 * @file scheduling.routes.ts
 * @description Interview scheduling routes.
 *
 * Public (no auth): GET /links/:token, POST /links/:token/book
 * Authenticated (ADMIN/HR): POST /suggest-slots, POST /links,
 *   PATCH /interviews/:id/reschedule, PATCH /interviews/:id/cancel
 */
import { Router } from 'express';
import { schedulingController } from '../controllers/scheduling.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// ── Authenticated (ADMIN / HR) ──────────────────────────────────────────────
router.post('/suggest-slots', authenticate, requireRole('ADMIN', 'HR'), schedulingController.suggestSlots);
router.post('/links',         authenticate, requireRole('ADMIN', 'HR'), schedulingController.createLink);
router.patch('/interviews/:id/reschedule', authenticate, requireRole('ADMIN', 'HR'), schedulingController.reschedule);
router.patch('/interviews/:id/cancel',     authenticate, requireRole('ADMIN', 'HR'), schedulingController.cancel);

// ── Public (candidate self-booking) ─────────────────────────────────────────
router.get('/links/:token',       schedulingController.getLink);
router.post('/links/:token/book', schedulingController.bookSlot);

export default router;
