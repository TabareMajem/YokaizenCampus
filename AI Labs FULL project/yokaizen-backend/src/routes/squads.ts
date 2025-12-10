import { Router } from 'express';
import { squadController } from '@controllers/SquadController';
import { authenticate, optionalAuth, requireTier } from '@middleware/auth';
import { validate, validatePagination, validateUUID } from '@middleware/validation';
import { rateLimit } from '@middleware/rateLimit';
import { squadSchemas } from '@utils/validators';

const router = Router();

// Public routes (with optional auth)
router.get('/', optionalAuth, validatePagination, squadController.list);

// Protected routes
router.use(authenticate);

// Squad CRUD
router.post(
  '/',
  requireTier('PRO_CREATOR'), // Only PRO can create squads
  validate(squadSchemas.createSquad),
  squadController.create
);

router.get('/:id', validateUUID('id'), squadController.get);

router.put(
  '/:id',
  validateUUID('id'),
  validate(squadSchemas.updateSquad),
  squadController.update
);

router.delete('/:id', validateUUID('id'), squadController.delete);

// Membership
router.post(
  '/:id/join',
  validateUUID('id'),
  rateLimit({ keyPrefix: 'squad-join', maxRequests: 5 }),
  squadController.join
);

router.post('/:id/leave', validateUUID('id'), squadController.leave);

router.post(
  '/:id/contribute',
  validateUUID('id'),
  validate(squadSchemas.contribute),
  squadController.contribute
);

// Members management
router.get('/:id/members', validateUUID('id'), squadController.getMembers);

router.post(
  '/:id/members/:memberId/promote',
  validateUUID('id'),
  validateUUID('memberId'),
  squadController.promoteMember
);

router.post(
  '/:id/members/:memberId/demote',
  validateUUID('id'),
  validateUUID('memberId'),
  squadController.demoteMember
);

router.post(
  '/:id/members/:memberId/kick',
  validateUUID('id'),
  validateUUID('memberId'),
  squadController.kickMember
);

router.post(
  '/:id/transfer',
  validateUUID('id'),
  validate(squadSchemas.transferOwnership),
  squadController.transferOwnership
);

// Missions / War Room
router.get('/:id/missions', validateUUID('id'), squadController.getMissions);

router.post(
  '/:id/deploy',
  validateUUID('id'),
  validate(squadSchemas.deploy),
  squadController.deploy
);

router.post(
  '/:id/missions/:missionId/join',
  validateUUID('id'),
  validateUUID('missionId'),
  squadController.joinMission
);

router.post(
  '/:id/missions/:missionId/contribute',
  validateUUID('id'),
  validateUUID('missionId'),
  validate(squadSchemas.missionContribute),
  squadController.contributeMission
);

// Chat & Stats
router.get('/:id/chat', validateUUID('id'), squadController.getChat);
router.get('/:id/leaderboard', validateUUID('id'), squadController.getLeaderboard);
router.get('/:id/stats', validateUUID('id'), squadController.getStats);

export default router;
