import { Router } from 'express';
import { aiController } from '../controllers';
import { authenticate, requireCredits } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { contentFilter } from '../middleware/contentFilter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// AI command endpoints (require credits and content filtering)
router.post('/command', rateLimiter.ai, contentFilter, requireCredits(50), aiController.generateGraph);
router.post('/simulate', rateLimiter.ai, contentFilter, requireCredits(5), aiController.simulateNode);
router.post('/audit', rateLimiter.ai, contentFilter, requireCredits(20), aiController.auditOutput);
router.post('/chat', rateLimiter.ai, contentFilter, requireCredits(10), aiController.chat);

// Info endpoints (no credit requirement)
router.get('/agents', aiController.getAgents);
router.get('/agents/:type', aiController.getAgentDetails);
router.get('/cost-estimate', aiController.estimateCost);
router.get('/usage', aiController.getUsage);
router.get('/providers', aiController.getProviders);

// Feedback
router.post('/feedback', aiController.submitFeedback);

export default router;
