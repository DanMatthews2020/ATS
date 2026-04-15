import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../utils/permissions';
import { auditLogController } from '../controllers/auditLog.controller';
import { retentionController } from '../controllers/retention.controller';
import { rightsRequestsController } from '../controllers/rightsRequests.controller';
import { ropaController } from '../controllers/ropa.controller';

const router = Router();

// Audit logs
router.get('/audit-logs', authenticate, requirePermission('audit_log:read'), auditLogController.getAuditLogs);
router.get('/audit-logs/candidate/:candidateId', authenticate, auditLogController.getCandidateAuditLogs);

// Retention
router.post('/retention/review', authenticate, requirePermission('admin:access'), retentionController.runReview);
router.get('/retention/candidates', authenticate, requirePermission('gdpr:read'), retentionController.getCandidates);

// Rights requests
router.get('/rights-requests', authenticate, requirePermission('gdpr:read'), rightsRequestsController.list);
router.post('/rights-requests', authenticate, requirePermission('gdpr:write'), rightsRequestsController.create);
router.patch('/rights-requests/:id', authenticate, requirePermission('gdpr:write'), rightsRequestsController.update);
router.get('/rights-requests/:id/export', authenticate, requirePermission('gdpr:read'), rightsRequestsController.downloadExport);
router.post('/rights-requests/:id/fulfil-erasure', authenticate, requirePermission('gdpr:erasure'), rightsRequestsController.fulfilErasure);

// RoPA register
router.get('/ropa', authenticate, requirePermission('gdpr:read'), ropaController.list);
router.post('/ropa', authenticate, requirePermission('admin:access'), ropaController.create);
router.patch('/ropa/:id', authenticate, requirePermission('admin:access'), ropaController.update);
router.post('/ropa/:id/review', authenticate, requirePermission('gdpr:read'), ropaController.markReviewed);

export default router;
