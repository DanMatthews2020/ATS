import { Router } from 'express';
import { interviewsController } from '../controllers/interviews.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/',                        authenticate, interviewsController.getAll);
router.post('/',                       authenticate, interviewsController.create);
router.get('/:id',                     authenticate, interviewsController.getById);
router.patch('/:id',                   authenticate, interviewsController.update);
router.patch('/:id/cancel',            authenticate, interviewsController.cancel);
router.post('/:id/feedback',           authenticate, interviewsController.submitFeedback);

export default router;
