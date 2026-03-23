import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { LoginSchema } from '../types/schemas';

const router = Router();

router.post('/login', validate(LoginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;
