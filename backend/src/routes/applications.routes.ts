import { Router } from 'express';
import { applicationsController } from '../controllers/applications.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { requireStageChangeAccess } from '../middleware/workspaceAccess.middleware';
import { UpdateApplicationStageSchema, CreateApplicationSchema, RejectApplicationSchema } from '../types/schemas';

const router = Router();

router.post('/',           authenticate, validate(CreateApplicationSchema), applicationsController.createApplication);
router.patch('/:id/stage',     authenticate, requireStageChangeAccess, validate(UpdateApplicationStageSchema), applicationsController.updateStage);
router.patch('/:id/sub-stage', authenticate, requireStageChangeAccess, applicationsController.updateSubStage);
router.patch('/:id/notes',     authenticate, applicationsController.updateNotes);
router.patch('/:id/reject',    authenticate, validate(RejectApplicationSchema), applicationsController.rejectApplication);

export default router;
