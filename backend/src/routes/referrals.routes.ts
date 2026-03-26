import { Router } from 'express';
import { referralsController } from '../controllers/referrals.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/',      authenticate, referralsController.getByCandidateId);
router.post('/',     authenticate, referralsController.create);
router.delete('/:id', authenticate, referralsController.delete);

export default router;
