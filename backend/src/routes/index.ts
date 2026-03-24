import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import jobsRoutes from './jobs.routes';
import candidatesRoutes from './candidates.routes';
import applicationsRoutes from './applications.routes';
import onboardingRoutes from './onboarding.routes';
import performanceRoutes from './performance.routes';
import insightsRoutes from './insights.routes';
import reportsRoutes from './reports.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/jobs', jobsRoutes);
router.use('/candidates', candidatesRoutes);
router.use('/applications', applicationsRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/performance', performanceRoutes);
router.use('/insights',   insightsRoutes);
router.use('/reports',    reportsRoutes);

export default router;
