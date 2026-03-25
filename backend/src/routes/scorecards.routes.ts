import { Router } from 'express';
import { scorecardsController } from '../controllers/scorecards.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/',    authenticate, scorecardsController.getAll);
router.post('/',   authenticate, scorecardsController.create);
router.get('/:id', authenticate, scorecardsController.getById);
router.patch('/:id', authenticate, scorecardsController.update);
router.delete('/:id', authenticate, scorecardsController.delete_);

export default router;
