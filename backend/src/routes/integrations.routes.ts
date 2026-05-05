import { Router } from 'express';
import { integrationsController } from '../controllers/integrations.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/status', authenticate, integrationsController.getStatus);

export default router;
