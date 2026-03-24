import { Router } from 'express';
import { candidatesController } from '../controllers/candidates.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateCandidateSchema } from '../types/schemas';

const router = Router();

router.get('/',          authenticate, candidatesController.getCandidates);
router.post('/',         authenticate, validate(CreateCandidateSchema), candidatesController.createCandidate);
router.get('/tracking',  authenticate, candidatesController.getTracking);  // must be before /:id
router.get('/:id',       authenticate, candidatesController.getCandidate);

export default router;
