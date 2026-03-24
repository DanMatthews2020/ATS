import { Router } from 'express';
import { offersController } from '../controllers/offers.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/',              authenticate, offersController.getAll);
router.post('/',             authenticate, offersController.create);
router.get('/:id',           authenticate, offersController.getById);
router.patch('/:id',         authenticate, offersController.update);
router.post('/:id/send',     authenticate, offersController.send);
router.patch('/:id/status',  authenticate, offersController.updateStatus);

export default router;
