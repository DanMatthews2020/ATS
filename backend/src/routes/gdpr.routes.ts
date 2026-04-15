import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { auditLogController } from '../controllers/auditLog.controller';

const router = Router();

// GET /gdpr/audit-logs — ADMIN/HR only, paginated with filters
router.get('/audit-logs', authenticate, auditLogController.getAuditLogs);

// GET /gdpr/audit-logs/candidate/:candidateId — any authenticated role, last 20
router.get('/audit-logs/candidate/:candidateId', authenticate, auditLogController.getCandidateAuditLogs);

export default router;
