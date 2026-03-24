import { Router } from 'express';
import { applicationsController } from '../controllers/applications.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { UpdateApplicationStageSchema } from '../types/schemas';

const router = Router();

router.patch('/:id/stage', authenticate, validate(UpdateApplicationStageSchema), applicationsController.updateStage);

export default router;
