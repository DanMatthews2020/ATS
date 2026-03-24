import { Router } from 'express';
import { insightsController } from '../controllers/insights.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/',               authenticate, insightsController.getAll);
router.get('/stats',          authenticate, insightsController.getStats);
router.get('/trends',         authenticate, insightsController.getTrends);
router.get('/pipeline',       authenticate, insightsController.getPipeline);
router.get('/sources',        authenticate, insightsController.getSources);
router.get('/reports',        authenticate, insightsController.getReports);
router.post('/reports',       authenticate, insightsController.createReport);
router.get('/reports/:id',    authenticate, insightsController.getReportById);
router.delete('/reports/:id', authenticate, insightsController.deleteReport);

export default router;
