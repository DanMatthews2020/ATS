import { Router } from 'express';
import { jobsController } from '../controllers/jobs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateJobSchema } from '../types/schemas';

const router = Router();

router.get('/stats',  authenticate, jobsController.getStats);
router.get('/',       authenticate, jobsController.getJobs);
router.post('/',      authenticate, validate(CreateJobSchema), jobsController.createJob);
router.get('/:id',              authenticate, jobsController.getJob);
router.get('/:id/applications', authenticate, jobsController.getJobApplications);
router.patch('/:id',            authenticate, jobsController.updateJob);

export default router;
