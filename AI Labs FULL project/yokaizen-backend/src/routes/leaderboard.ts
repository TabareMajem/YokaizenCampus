import { Router } from 'express';
import { leaderboardController } from '@controllers/LeaderboardController';
import { authenticate, optionalAuth } from '@middleware/auth';
import { rateLimit } from '@middleware/rateLimit';

const router = Router();

// Public routes (cached, so generous rate limits)
router.get(
  '/global',
  optionalAuth,
  rateLimit({ keyPrefix: 'leaderboard', maxRequests: 60, windowMs: 60000 }),
  leaderboardController.getGlobal
);

router.get(
  '/squads',
  rateLimit({ keyPrefix: 'leaderboard', maxRequests: 60, windowMs: 60000 }),
  leaderboardController.getSquads
);

router.get(
  '/regional',
  rateLimit({ keyPrefix: 'leaderboard', maxRequests: 60, windowMs: 60000 }),
  leaderboardController.getRegional
);

router.get(
  '/game/:gameType',
  rateLimit({ keyPrefix: 'leaderboard', maxRequests: 60, windowMs: 60000 }),
  leaderboardController.getGameLeaderboard
);

router.get(
  '/timeframed',
  optionalAuth,
  rateLimit({ keyPrefix: 'leaderboard', maxRequests: 60, windowMs: 60000 }),
  leaderboardController.getTimeframed
);

// Protected routes - user-specific
router.get('/me', authenticate, leaderboardController.getMyRankings);
router.get('/around-me', authenticate, leaderboardController.getAroundMe);

export default router;
