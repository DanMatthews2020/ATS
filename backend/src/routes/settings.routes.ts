import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Profile
router.get('/profile',           authenticate, settingsController.getProfile);
router.patch('/profile',         authenticate, settingsController.updateProfile);

// Integrations
router.get('/integrations',      authenticate, settingsController.getIntegrations);
router.patch('/integrations/:key', authenticate, settingsController.toggleIntegration);

// Notifications
router.get('/notifications',     authenticate, settingsController.getNotifications);
router.patch('/notifications',   authenticate, settingsController.updateNotifications);

// Billing
router.get('/billing',           authenticate, settingsController.getBilling);

// Security
router.get('/security',          authenticate, settingsController.getSecuritySettings);
router.patch('/security',        authenticate, settingsController.updateSecuritySettings);
router.delete('/security/sessions/:id', authenticate, settingsController.revokeSession);

export default router;
