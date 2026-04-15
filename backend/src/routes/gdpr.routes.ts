import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { auditLogController } from '../controllers/auditLog.controller';
import { retentionController } from '../controllers/retention.controller';
import { rightsRequestsController } from '../controllers/rightsRequests.controller';

const router = Router();

// Audit logs
router.get('/audit-logs', authenticate, auditLogController.getAuditLogs);
router.get('/audit-logs/candidate/:candidateId', authenticate, auditLogController.getCandidateAuditLogs);

// Retention
router.post('/retention/review', authenticate, retentionController.runReview);
router.get('/retention/candidates', authenticate, retentionController.getCandidates);

// Rights requests
router.get('/rights-requests', authenticate, rightsRequestsController.list);
router.post('/rights-requests', authenticate, rightsRequestsController.create);
router.patch('/rights-requests/:id', authenticate, rightsRequestsController.update);
router.get('/rights-requests/:id/export', authenticate, rightsRequestsController.downloadExport);
router.post('/rights-requests/:id/fulfil-erasure', authenticate, rightsRequestsController.fulfilErasure);

export default router;
