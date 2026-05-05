import { Router } from 'express';
import { interviewsController } from '../controllers/interviews.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../utils/permissions';
import { requireInterviewAccess } from '../middleware/workspaceAccess.middleware';

const router = Router();

router.get('/',                        authenticate, interviewsController.getAll);
router.post('/',                       authenticate, requirePermission('feedback:write'), interviewsController.create);
router.get('/:id',                     authenticate, requireInterviewAccess, interviewsController.getById);
router.patch('/:id',                   authenticate, requirePermission('feedback:write'), interviewsController.update);
router.patch('/:id/cancel',            authenticate, interviewsController.cancel);
router.post('/:id/feedback',           authenticate, requirePermission('feedback:write'), interviewsController.submitFeedback);
router.post('/:id/feedback-submit',   authenticate, requireInterviewAccess, interviewsController.submitFeedbackWorkflow);
router.get('/:id/feedback-status',    authenticate, requireInterviewAccess, interviewsController.getFeedbackStatus);

export default router;
