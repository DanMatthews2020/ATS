import { Router } from 'express';
import { googleAuthController } from '../controllers/googleAuth.controller';

const router = Router();

router.get('/url',      googleAuthController.getAuthUrl);
router.get('/callback',  googleAuthController.callback);
router.get('/status',    googleAuthController.getStatus);

export default router;
