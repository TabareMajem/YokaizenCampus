import { Router } from 'express';
import { arController } from '../controllers';
import { authenticate, requireRole } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Scanning
router.post('/scan', rateLimiter.arScan, arController.scan);
router.get('/scans', arController.getUserScans);
router.get('/unlockable', arController.getUnlockableAgents);

// Admin marker management
router.get('/markers', requireRole(['ADMIN']), arController.getMarkers);
router.get('/markers/:id', requireRole(['ADMIN']), arController.getMarker);
router.post('/markers', requireRole(['ADMIN']), arController.createMarker);
router.patch('/markers/:id', requireRole(['ADMIN']), arController.updateMarker);
router.delete('/markers/:id', requireRole(['ADMIN']), arController.deleteMarker);

// Stats
router.get('/stats', requireRole(['ADMIN']), arController.getStats);

export default router;
