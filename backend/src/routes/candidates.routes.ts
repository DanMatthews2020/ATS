import { Router } from 'express';
import multer from 'multer';
import { candidatesController } from '../controllers/candidates.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateCandidateSchema } from '../types/schemas';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/',           authenticate, candidatesController.getCandidates);
router.post('/',          authenticate, validate(CreateCandidateSchema), candidatesController.createCandidate);
router.post('/parse-cv',  authenticate, upload.single('cv'), candidatesController.parseCv);
router.get('/tracking',   authenticate, candidatesController.getTracking);
router.get('/:id',        authenticate, candidatesController.getCandidate);
router.get('/:id/feed',       authenticate, candidatesController.getFeed);
router.get('/:id/notes',      authenticate, candidatesController.getNotes);
router.post('/:id/notes',     authenticate, candidatesController.createNote);
router.patch('/:id/notes/:noteId', authenticate, candidatesController.updateNote);
router.delete('/:id/notes/:noteId', authenticate, candidatesController.deleteNote);
router.patch('/:id/tags',     authenticate, candidatesController.updateTags);
router.get('/:id/feedback',   authenticate, candidatesController.getFeedback);
router.get('/:id/emails',     authenticate, candidatesController.getEmails);

export default router;
