/**
 * @file scheduling.routes.ts
 * @description Interview scheduling routes.
 *
 * Public (no auth): GET /public/:token, POST /public/:token/book
 * Authenticated (ADMIN/HR): POST /suggest-slots, POST /links, GET /links/:applicationId,
 *   PUT /interviews/:id/reschedule, DELETE /interviews/:id
 * Authenticated (ADMIN/HR/MANAGER): GET /links/:applicationId
 */
import { Router } from 'express';
import { schedulingController } from '../controllers/scheduling.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// ── Authenticated ───────────────────────────────────────────────────────────
router.post('/suggest-slots',              authenticate, requireRole('ADMIN', 'HR'), schedulingController.suggestSlots);
router.post('/links',                      authenticate, requireRole('ADMIN', 'HR'), schedulingController.createLink);
router.get('/links/:applicationId',        authenticate, requireRole('ADMIN', 'HR', 'MANAGER'), schedulingController.getLinksByApplication);
router.put('/interviews/:id/reschedule',   authenticate, requireRole('ADMIN', 'HR'), schedulingController.reschedule);
router.delete('/interviews/:id',           authenticate, requireRole('ADMIN', 'HR'), schedulingController.cancel);

// ── Public (candidate self-booking) ─────────────────────────────────────────
router.get('/public/:token',       schedulingController.getPublicLink);
router.post('/public/:token/book', schedulingController.bookSlot);

export default router;
