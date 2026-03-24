import { Router } from 'express';
import multer from 'multer';
import { onboardingController } from '../controllers/onboarding.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

router.get('/',                  authenticate, onboardingController.getSession);
router.get('/activity',          authenticate, onboardingController.getActivity);
router.post('/step/1',           authenticate, onboardingController.saveProfile);
router.post('/step/2',           authenticate, onboardingController.advanceToStep3);
router.patch('/skip',            authenticate, onboardingController.skipStep);
router.patch('/tasks/:taskId',   authenticate, onboardingController.updateTask);
router.post('/upload',           authenticate, upload.single('file'), onboardingController.uploadDocument);
router.post('/complete',         authenticate, onboardingController.complete);
router.post('/assistance',       authenticate, onboardingController.requestAssistance);

export default router;
