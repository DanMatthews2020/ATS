import { Router } from 'express';
import { followUpsController } from '../controllers/followups.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/',      authenticate, followUpsController.list);
router.post('/',     authenticate, followUpsController.create);
router.patch('/:id', authenticate, followUpsController.update);
router.delete('/:id', authenticate, followUpsController.remove);

export default router;
