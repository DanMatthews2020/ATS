import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { checkCandidateAccess } from '../middleware/jobAccess.middleware';
import { gmailController } from '../controllers/gmail.controller';

const router = Router();

// ── Candidate email endpoints ────────────────────────────────────────────────
// Job-access middleware: ADMIN/HR pass, MANAGER needs JobMember on candidate's job
router.get(
  '/candidates/:candidateId/emails',
  authenticate,
  checkCandidateAccess,
  gmailController.getThreads,
);

router.post(
  '/candidates/:candidateId/emails/sync',
  authenticate,
  requireRole('ADMIN', 'HR'),
  gmailController.syncCandidate,
);

router.post(
  '/candidates/:candidateId/emails/send',
  authenticate,
  requireRole('ADMIN', 'HR'),
  gmailController.sendEmail,
);

// ── Gmail status/connect endpoints ───────────────────────────────────────────
router.get('/gmail/status',  authenticate, gmailController.getStatus);
router.get('/gmail/connect', authenticate, requireRole('ADMIN', 'HR'), gmailController.getConnectUrl);

export default router;
