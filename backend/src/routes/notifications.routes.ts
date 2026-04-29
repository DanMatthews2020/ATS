import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/',              authenticate, notificationsController.getAll);
router.get('/unread-count',  authenticate, notificationsController.getUnreadCount);
router.post('/mark-all-read', authenticate, notificationsController.markAllRead);
router.patch('/:id/read',    authenticate, notificationsController.markRead);

// Aliases matching spec convention (PUT)
router.put('/read-all',   authenticate, notificationsController.markAllRead);
router.put('/:id/read',   authenticate, notificationsController.markRead);

export default router;
