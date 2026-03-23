import { Router } from 'express';
import { candidatesController } from '../controllers/candidates.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/tracking', authenticate, candidatesController.getTracking);

export default router;
