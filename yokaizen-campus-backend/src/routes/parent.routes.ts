import { Router } from 'express';
import { parentController } from '../controllers';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Parent-specific routes
router.post('/link', requireRole('PARENT'), parentController.linkChild);
router.get('/children', requireRole('PARENT'), parentController.getChildren);
router.delete('/children/:studentId', requireRole('PARENT'), parentController.unlinkChild);
router.get('/dashboard', requireRole(UserRole.PARENT), parentController.getDashboard);

// Child information (for parents)
router.get('/child/:studentId/report', requireRole('PARENT'), parentController.getChildReport);
router.get('/child/:studentId/progress', requireRole('PARENT'), parentController.getChildProgress);
router.get('/child/:studentId/activity', requireRole('PARENT'), parentController.getChildActivity);
router.get('/child/:studentId/achievements', requireRole('PARENT'), parentController.getChildAchievements);
router.get('/child/:studentId/credits', requireRole('PARENT'), parentController.getChildCredits);
router.post('/child/:studentId/sponsor', requireRole('PARENT'), parentController.sponsorChild);

// Notification preferences
router.get('/notifications', requireRole('PARENT'), parentController.getNotificationPrefs);
router.patch('/notifications', requireRole('PARENT'), parentController.updateNotificationPrefs);

// Student-side link verification
router.get('/pending-links', requireRole('STUDENT'), parentController.getPendingLinks);
router.post('/verify-link', requireRole('STUDENT'), parentController.verifyLink);
router.post('/reject-link', requireRole('STUDENT'), parentController.rejectLink);

export default router;
