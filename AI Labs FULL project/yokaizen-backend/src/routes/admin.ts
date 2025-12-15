import { Router } from 'express';
import { adminController } from '@controllers/AdminController';
import { authenticate } from '@middleware/auth';
import { rateLimit } from '@middleware/rateLimit';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// Rate limit admin actions
const adminRateLimit = rateLimit({
    keyPrefix: 'admin',
    maxRequests: 100,
    windowMs: 60000
});

// Dashboard stats
router.get('/stats', adminRateLimit, adminController.getStats);
router.get('/traffic', adminRateLimit, adminController.getTraffic);

// Rewards management
router.get('/rewards', adminRateLimit, adminController.getRewards);
router.post('/rewards', adminRateLimit, adminController.createReward);
router.put('/rewards/:id', adminRateLimit, adminController.updateReward);
router.delete('/rewards/:id', adminRateLimit, adminController.deleteReward);

// User management
router.get('/users', adminRateLimit, adminController.getUsers);
router.put('/users/:id/role', adminRateLimit, adminController.updateUserRole);
router.post('/users/:id/ban', adminRateLimit, adminController.banUser);
router.post('/users/:id/unban', adminRateLimit, adminController.unbanUser);

export default router;
