import { Router } from 'express';
import { adminController } from '../controllers';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Dashboard and stats
router.get('/stats', adminController.getStats);
router.get('/health', adminController.getHealth);

// User management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/credits', adminController.addCredits);

// School management
router.get('/schools', adminController.getSchools);
router.post('/schools', adminController.createSchool);

// AI usage and logs
router.get('/ai-usage', adminController.getAIUsage);
router.get('/audit-logs', adminController.getAuditLogs);

// System settings
router.get('/settings', adminController.getSettings);
router.patch('/settings', adminController.updateSettings);
router.post('/school-key', adminController.updateSchoolKey);

// System operations
router.post('/broadcast', adminController.sendBroadcast);
router.post('/maintenance', adminController.toggleMaintenance);

export default router;
