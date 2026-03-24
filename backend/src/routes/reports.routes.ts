import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Runs
router.get('/runs',              authenticate, reportsController.getRuns);
router.post('/run',              authenticate, reportsController.startRun);
router.get('/runs/export-all',   authenticate, reportsController.exportAll);
router.get('/runs/:id/status',   authenticate, reportsController.getRunStatus);
router.get('/runs/:id/download', authenticate, reportsController.downloadRun);

// Scheduled
router.get('/scheduled',         authenticate, reportsController.getScheduled);
router.post('/scheduled',        authenticate, reportsController.createSchedule);
router.patch('/scheduled/:id',   authenticate, reportsController.updateSchedule);
router.delete('/scheduled/:id',  authenticate, reportsController.deleteSchedule);

// Custom
router.post('/custom',           authenticate, reportsController.createCustomReport);

export default router;
