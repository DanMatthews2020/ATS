import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { rejectionReasonsController } from '../controllers/rejectionReasons.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateRejectionReasonSchema, UpdateRejectionReasonSchema } from '../types/schemas';

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

// Rejection Reasons
router.get('/rejection-reasons',       authenticate, rejectionReasonsController.list);
router.post('/rejection-reasons',      authenticate, validate(CreateRejectionReasonSchema), rejectionReasonsController.create);
router.patch('/rejection-reasons/:id', authenticate, validate(UpdateRejectionReasonSchema), rejectionReasonsController.update);
router.delete('/rejection-reasons/:id', authenticate, rejectionReasonsController.remove);

export default router;
