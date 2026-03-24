import { Router } from 'express';
import { performanceController } from '../controllers/performance.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats',                  authenticate, performanceController.getStats);
router.get('/users',                  authenticate, performanceController.getUserList);
router.get('/charts/scores',          authenticate, performanceController.getScoreDistribution);
router.get('/charts/competencies',    authenticate, performanceController.getCompetencyData);

router.get('/cycles',                 authenticate, performanceController.getCycles);
router.post('/cycles',                authenticate, performanceController.createCycle);
router.get('/cycles/:id',             authenticate, performanceController.getCycleById);

router.get('/goals',                  authenticate, performanceController.getGoals);
router.post('/goals',                 authenticate, performanceController.createGoal);
router.get('/goals/:id',              authenticate, performanceController.getGoalById);
router.patch('/goals/:id',            authenticate, performanceController.updateGoal);

router.get('/employees',              authenticate, performanceController.getEmployees);
router.post('/employees',             authenticate, performanceController.addEmployee);
router.get('/employees/:id',          authenticate, performanceController.getEmployeeById);

export default router;
