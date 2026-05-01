/**
 * @file calendar.routes.ts
 * @description Google Calendar integration routes.
 *
 * All routes require authentication except /callback (OAuth redirect).
 * Event CRUD and free-busy are restricted to ADMIN and HR roles.
 */
import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// OAuth flow
router.get('/auth-url',     authenticate, calendarController.getAuthUrl);
router.get('/callback',     calendarController.handleCallback); // No auth — Google redirects here
router.get('/connect',      authenticate, calendarController.getConnectUrl);

// Status
router.get('/status',       authenticate, calendarController.getStatus);
router.delete('/disconnect', authenticate, calendarController.disconnect);

// Free/busy
router.post('/free-busy',   authenticate, requireRole('ADMIN', 'HR'), calendarController.getFreeBusy);

// Event CRUD
router.post('/events',           authenticate, requireRole('ADMIN', 'HR'), calendarController.createEvent);
router.put('/events/:eventId',   authenticate, requireRole('ADMIN', 'HR'), calendarController.updateEvent);
router.delete('/events/:eventId', authenticate, requireRole('ADMIN', 'HR'), calendarController.cancelEvent);

export default router;
