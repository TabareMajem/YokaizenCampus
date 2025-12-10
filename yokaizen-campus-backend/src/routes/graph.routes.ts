import { Router } from 'express';
import { graphController } from '../controllers';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Graph session management
router.post('/', graphController.createSession);
router.get('/', graphController.getSessions);
router.get('/stats', graphController.getStats);
router.get('/:id', graphController.getSession);
router.delete('/:id', graphController.deleteSession);

// Graph operations
router.put('/:id/sync', rateLimiter.graphSync, graphController.syncGraph);
router.post('/:id/audit', graphController.auditNode);
router.post('/:id/node', graphController.nodeAction);
router.post('/:id/complete', graphController.completeSession);
router.post('/:id/fork', graphController.forkSession);

// History and snapshots
router.get('/:id/history', graphController.getHistory);
router.post('/:id/snapshot', graphController.createSnapshot);
router.post('/:id/restore/:snapshotId', graphController.restoreSnapshot);

export default router;
