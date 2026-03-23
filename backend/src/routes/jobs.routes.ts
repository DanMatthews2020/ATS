import { Router } from 'express';
import { jobsController } from '../controllers/jobs.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, jobsController.getJobs);

export default router;
