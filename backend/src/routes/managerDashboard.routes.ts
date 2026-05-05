import { Router } from 'express';
import { managerDashboardController } from '../controllers/managerDashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, managerDashboardController.getDashboard);

export default router;
