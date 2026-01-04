import { Router } from 'express';
import { authController } from '../controllers';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes
router.post('/register', rateLimiter.auth, authController.register);
router.post('/login', rateLimiter.auth, authController.login);
router.post('/refresh', rateLimiter.auth, authController.refresh);
router.post('/verify-token', rateLimiter.auth, authController.verifyToken);
router.post('/firebase', rateLimiter.auth, authController.loginWithFirebase);


// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getProfile);
router.patch('/me', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
