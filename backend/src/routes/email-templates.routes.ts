import { Router } from 'express';
import { emailTemplatesController } from '../controllers/email-templates.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.get('/',      authenticate, emailTemplatesController.list);
router.post('/',     authenticate, emailTemplatesController.create);
router.get('/:id',   authenticate, emailTemplatesController.getOne);
router.patch('/:id', authenticate, emailTemplatesController.update);
router.delete('/:id', authenticate, emailTemplatesController.remove);
export default router;
