import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', authenticate, dashboardController.getStats);

export default router;
