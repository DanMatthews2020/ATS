import { Router } from 'express';
import { jobsController } from '../controllers/jobs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateJobSchema } from '../types/schemas';

const router = Router();

router.get('/',    authenticate, jobsController.getJobs);
router.post('/',   authenticate, validate(CreateJobSchema), jobsController.createJob);
router.get('/:id', authenticate, jobsController.getJob);

export default router;
