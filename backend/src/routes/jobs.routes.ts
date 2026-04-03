import { Router } from 'express';
import { jobsController } from '../controllers/jobs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateJobSchema } from '../types/schemas';

const router = Router();

router.get('/stats',          authenticate, jobsController.getStats);
router.get('/pipeline-stats', authenticate, jobsController.getPipelineStats);
router.get('/',       authenticate, jobsController.getJobs);
router.post('/',      authenticate, validate(CreateJobSchema), jobsController.createJob);
router.get('/:id',                   authenticate, jobsController.getJob);
router.get('/:id/stages',            authenticate, jobsController.getJobStages);
router.get('/:id/members',           authenticate, jobsController.getJobMembers);
router.post('/:id/members',          authenticate, jobsController.addJobMember);
router.delete('/:id/members/:memberId', authenticate, jobsController.removeJobMember);
router.post('/:id/stages',           authenticate, jobsController.saveJobStages);
router.get('/:id/applications',      authenticate, jobsController.getJobApplications);
router.get('/:id/candidates',        authenticate, jobsController.getJobCandidates);
router.get('/:id/pipeline-stats',    authenticate, jobsController.getJobPipelineStats);
router.patch('/:id',                 authenticate, jobsController.updateJob);
router.delete('/:id',                authenticate, jobsController.deleteJob);

export default router;
