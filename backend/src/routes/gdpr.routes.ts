import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { auditLogController } from '../controllers/auditLog.controller';
import { retentionController } from '../controllers/retention.controller';

const router = Router();

// GET /gdpr/audit-logs — ADMIN/HR only, paginated with filters
router.get('/audit-logs', authenticate, auditLogController.getAuditLogs);

// GET /gdpr/audit-logs/candidate/:candidateId — any authenticated role, last 20
router.get('/audit-logs/candidate/:candidateId', authenticate, auditLogController.getCandidateAuditLogs);

// POST /gdpr/retention/review — ADMIN only
router.post('/retention/review', authenticate, retentionController.runReview);

// GET /gdpr/retention/candidates — ADMIN or HR
router.get('/retention/candidates', authenticate, retentionController.getCandidates);

export default router;
