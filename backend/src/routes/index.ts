import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import jobsRoutes from './jobs.routes';
import candidatesRoutes from './candidates.routes';
import applicationsRoutes from './applications.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/jobs', jobsRoutes);
router.use('/candidates', candidatesRoutes);
router.use('/applications', applicationsRoutes);

export default router;
