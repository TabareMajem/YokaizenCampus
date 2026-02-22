import { Router } from 'express';
import { grantController } from '../controllers';
import { authenticate, requireRole } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public route for application (rate limited)
router.post('/apply', rateLimiter.grant, grantController.apply);

// Get supported regions (public)
router.get('/regions', grantController.getRegions);

// Protected routes
router.use(authenticate);

// Application management
router.get('/applications', grantController.getApplications);
router.get('/applications/:id', grantController.getApplication);
router.delete('/applications/:id', grantController.withdrawApplication);

// Admin-only routes
router.patch('/applications/:id', requireRole('ADMIN'), grantController.updateApplication);
router.post('/applications/bulk-update', requireRole('ADMIN'), grantController.bulkUpdate);
router.post('/applications/:id/allocate', requireRole('ADMIN'), grantController.allocateCredits);
router.post('/applications/:id/extend', requireRole('ADMIN'), grantController.extendGrant);
router.get('/stats', requireRole('ADMIN'), grantController.getStats);

// Application communication
router.get('/applications/:id/usage', grantController.getUsage);
router.get('/applications/:id/messages', grantController.getMessages);
router.post('/applications/:id/message', grantController.sendMessage);
router.post('/applications/:id/documents', grantController.uploadDocuments);

export default router;
