/**
 * @file calendar.routes.ts
 * @description Google Calendar integration routes.
 *
 * All routes require authentication except /callback (OAuth redirect).
 * /free-busy is restricted to ADMIN and HR roles.
 */
import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

router.get('/auth-url',     authenticate, calendarController.getAuthUrl);
router.get('/callback',     calendarController.handleCallback); // No auth — Google redirects here
router.get('/status',       authenticate, calendarController.getStatus);
router.delete('/disconnect', authenticate, calendarController.disconnect);
router.post('/free-busy',   authenticate, requireRole('ADMIN', 'HR'), calendarController.getFreeBusy);

export default router;
