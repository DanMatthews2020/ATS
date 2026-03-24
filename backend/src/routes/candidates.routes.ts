import { Router } from 'express';
import multer from 'multer';
import { candidatesController } from '../controllers/candidates.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateCandidateSchema } from '../types/schemas';

const router = Router();

// Multer: memory storage, 5 MB limit, PDF + plain text only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/',          authenticate, candidatesController.getCandidates);
router.post('/',         authenticate, validate(CreateCandidateSchema), candidatesController.createCandidate);
router.post('/parse-cv', authenticate, upload.single('cv'), candidatesController.parseCv);
router.get('/tracking',  authenticate, candidatesController.getTracking);  // must stay before /:id
router.get('/:id',       authenticate, candidatesController.getCandidate);

export default router;
