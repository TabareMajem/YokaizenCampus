import { Router } from 'express';
import { userController } from '@controllers/UserController';
import { authenticate } from '@middleware/auth';
import { validate, validatePagination } from '@middleware/validation';
import { rateLimit } from '@middleware/rateLimit';
import { userSchemas } from '@utils/validators';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Profile
router.get('/me', userController.getProfile);
router.patch('/me', validate(userSchemas.updateProfile), userController.updateProfile);
router.patch('/keys', validate(userSchemas.updateApiKeys), userController.updateApiKeys);
router.get('/stats', userController.getStats);

// Inventory
router.get('/inventory', validatePagination, userController.getInventory);
router.post('/inventory/:itemId/equip', userController.equipItem);

// Skills
router.get('/skills', userController.getSkills);
router.post(
  '/skill/unlock',
  rateLimit({ keyPrefix: 'skill-unlock', maxRequests: 10 }),
  validate(userSchemas.unlockSkill),
  userController.unlockSkill
);

// Agents
router.get('/agents', validatePagination, userController.getAgents);

// Achievements
router.get('/achievements', userController.getAchievements);

// Energy & Streaks
router.post('/energy/refresh', userController.refreshEnergy);
router.post('/streak/claim', userController.claimStreak);

// Notifications
router.get('/notifications', userController.getNotifications);

// Account management
router.delete('/account', userController.deleteAccount);

export default router;
