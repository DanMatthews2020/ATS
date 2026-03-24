import { Router } from 'express';
import { applicationsController } from '../controllers/applications.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { UpdateApplicationStageSchema, CreateApplicationSchema } from '../types/schemas';

const router = Router();

router.post('/',           authenticate, validate(CreateApplicationSchema), applicationsController.createApplication);
router.patch('/:id/stage', authenticate, validate(UpdateApplicationStageSchema), applicationsController.updateStage);
router.patch('/:id/notes', authenticate, applicationsController.updateNotes);

export default router;
