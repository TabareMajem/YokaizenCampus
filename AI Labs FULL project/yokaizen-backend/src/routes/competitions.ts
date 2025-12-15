import { Router } from 'express';
import { competitionController } from '@controllers/CompetitionController';
import { authenticate, optionalAuth } from '@middleware/auth';
import { rateLimit } from '@middleware/rateLimit';

const router = Router();

// Public routes (with optional auth for personalization)
router.get(
    '/',
    optionalAuth,
    rateLimit({ keyPrefix: 'competitions', maxRequests: 60, windowMs: 60000 }),
    competitionController.getCompetitions
);

router.get(
    '/:id',
    optionalAuth,
    rateLimit({ keyPrefix: 'competitions', maxRequests: 60, windowMs: 60000 }),
    competitionController.getCompetition
);

router.get(
    '/:id/leaderboard',
    rateLimit({ keyPrefix: 'competitions', maxRequests: 60, windowMs: 60000 }),
    competitionController.getLeaderboard
);

// Protected routes
router.use(authenticate);

router.post(
    '/:id/join',
    rateLimit({ keyPrefix: 'competition-join', maxRequests: 10, windowMs: 60000 }),
    competitionController.joinCompetition
);

router.post(
    '/:id/score',
    rateLimit({ keyPrefix: 'competition-score', maxRequests: 30, windowMs: 60000 }),
    competitionController.submitScore
);

// Admin routes (admin check is done in controller)
router.post(
    '/',
    rateLimit({ keyPrefix: 'competition-admin', maxRequests: 20, windowMs: 60000 }),
    competitionController.createCompetition
);

router.delete(
    '/:id',
    rateLimit({ keyPrefix: 'competition-admin', maxRequests: 20, windowMs: 60000 }),
    competitionController.deleteCompetition
);

export default router;
