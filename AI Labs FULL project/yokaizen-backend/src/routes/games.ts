import { Router } from 'express';
import { gameController } from '@controllers/GameController';
import { authenticate, optionalAuth, requireTier } from '@middleware/auth';
import { validate, validatePagination, validateUUID } from '@middleware/validation';
import { rateLimit } from '@middleware/rateLimit';
import { gameSchemas } from '@utils/validators';

const router = Router();

// Public routes (with optional auth for personalization)
router.get('/types', optionalAuth, gameController.getTypes);

// Protected routes
router.use(authenticate);

// Core gameplay
router.post(
  '/start',
  rateLimit({ keyPrefix: 'game-start', maxRequests: 30 }),
  validate(gameSchemas.startGame),
  gameController.start
);

router.post(
  '/submit',
  rateLimit({ keyPrefix: 'game-submit', maxRequests: 30 }),
  validate(gameSchemas.submitGame),
  gameController.submit
);

router.get('/history', validatePagination, gameController.getHistory);
router.get('/stats', gameController.getStats);

// Daily challenge
router.get('/daily-challenge', gameController.getDailyChallenge);
router.post(
  '/daily-challenge/complete',
  validate(gameSchemas.submitGame),
  gameController.completeDailyChallenge
);

// Specific game by ID
router.get('/:id', validateUUID('id'), gameController.getGame);

// =========== Generated Games (Game Creator) ===========

// List generated games
router.get('/generated', validatePagination, gameController.getGeneratedGames);

// Create generated game (PRO tier only)
router.post(
  '/generated',
  requireTier('PRO_CREATOR'),
  validate(gameSchemas.createGeneratedGame),
  gameController.createGeneratedGame
);

// Generated game operations
router.get('/generated/:id', validateUUID('id'), gameController.getGeneratedGame);

router.put(
  '/generated/:id',
  validateUUID('id'),
  validate(gameSchemas.updateGeneratedGame),
  gameController.updateGeneratedGame
);

router.delete('/generated/:id', validateUUID('id'), gameController.deleteGeneratedGame);

// Play generated game
router.post('/generated/:id/play', validateUUID('id'), gameController.playGeneratedGame);

router.post(
  '/generated/:id/progress',
  validateUUID('id'),
  validate(gameSchemas.updateGameProgress),
  gameController.updateGameProgress
);

router.post(
  '/generated/:id/complete',
  validateUUID('id'),
  validate(gameSchemas.completeGeneratedGame),
  gameController.completeGeneratedGame
);

router.post(
  '/generated/:id/rate',
  validateUUID('id'),
  validate(gameSchemas.rateGame),
  gameController.rateGeneratedGame
);

export default router;
