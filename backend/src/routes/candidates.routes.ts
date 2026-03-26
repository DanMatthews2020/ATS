import { Router } from 'express';
import multer from 'multer';
import { candidatesController } from '../controllers/candidates.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateCandidateSchema } from '../types/schemas';

const router = Router();

const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and plain-text files are supported.'));
    }
  },
});

router.get('/',           authenticate, candidatesController.getCandidates);
router.post('/',          authenticate, validate(CreateCandidateSchema), candidatesController.createCandidate);
router.post('/parse-cv',  authenticate, upload.single('cv'), candidatesController.parseCv);
router.post('/merge',     authenticate, candidatesController.merge);
router.get('/tracking',   authenticate, candidatesController.getTracking);
router.get('/:id',        authenticate, candidatesController.getCandidate);
router.delete('/:id',     authenticate, candidatesController.deleteCandidate);
router.patch('/:id/do-not-contact', authenticate, candidatesController.setDoNotContact);
router.get('/:id/feed',       authenticate, candidatesController.getFeed);
router.get('/:id/notes',      authenticate, candidatesController.getNotes);
router.post('/:id/notes',     authenticate, candidatesController.createNote);
router.patch('/:id/notes/:noteId', authenticate, candidatesController.updateNote);
router.delete('/:id/notes/:noteId', authenticate, candidatesController.deleteNote);
router.patch('/:id/tags',     authenticate, candidatesController.updateTags);
router.get('/:id/feedback',   authenticate, candidatesController.getFeedback);
router.get('/:id/emails',     authenticate, candidatesController.getEmails);

export default router;
