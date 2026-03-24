import { Router } from 'express';
import { teamController } from '../controllers/team.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/',           authenticate, teamController.getAll);
router.post('/invite',    authenticate, teamController.invite);
router.patch('/:id/role', authenticate, teamController.updateRole);
router.delete('/:id',     authenticate, teamController.remove);

export default router;
