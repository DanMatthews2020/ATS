import { Router } from 'express';
import { evaluationsController } from '../controllers/evaluations.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/candidate/:candidateId', authenticate, evaluationsController.getByCandidate);
router.post('/',                      authenticate, evaluationsController.create);
router.patch('/:id',                  authenticate, evaluationsController.update);

export default router;
