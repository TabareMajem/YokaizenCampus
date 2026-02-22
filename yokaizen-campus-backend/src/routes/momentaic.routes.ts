import { Router } from 'express';
import { momentaicAuth } from '../middleware/momentaicAuth';
import { momentaicController } from '../controllers/momentaic.controller';

const router = Router();

// Apply server-to-server protection on all /momentaic routes
router.use(momentaicAuth);

// Character Synchronization
router.post('/characters/sync', momentaicController.syncCharacter);

// Remote Task Execution
router.post('/tasks/trigger', momentaicController.triggerTask);
router.get('/tasks/:job_id/status', momentaicController.getTaskStatus);

export default router;
