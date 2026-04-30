import { Router } from 'express';
import { invitationController } from '../controllers/invitation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public — validate invitation by token (no auth required for invite acceptance page)
router.get('/:token',         invitationController.validate);

// Authenticated
router.get('/',               authenticate, invitationController.list);
router.post('/',              authenticate, invitationController.create);
router.post('/:token/accept', authenticate, invitationController.accept);
router.delete('/:id',         authenticate, invitationController.cancel);

export default router;
