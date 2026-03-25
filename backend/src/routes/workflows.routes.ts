import { Router } from 'express';
import { workflowsController } from '../controllers/workflows.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/job/:jobId',              authenticate, workflowsController.getByJobId);
router.post('/',                       authenticate, workflowsController.create);
router.patch('/:id',                   authenticate, workflowsController.update);
router.post('/:id/stages',             authenticate, workflowsController.addStage);
router.patch('/:id/stages/reorder',    authenticate, workflowsController.reorderStages);
router.patch('/:id/stages/:stageId',   authenticate, workflowsController.updateStage);
router.delete('/:id/stages/:stageId',  authenticate, workflowsController.deleteStage);

export default router;
