import { Router } from 'express';
import { authController } from '@controllers/AuthController';
import { authenticate } from '@middleware/auth';
import { validate } from '@middleware/validation';
import { ipRateLimit } from '@middleware/rateLimit';
import { authSchemas } from '@utils/validators';

const router = Router();

// Public routes with IP rate limiting
router.post(
  '/verify',
  ipRateLimit(10, 60000), // 10 requests per minute per IP
  validate(authSchemas.verify),
  authController.verify
);

router.post(
  '/refresh',
  ipRateLimit(20, 60000),
  validate(authSchemas.refresh),
  authController.refresh
);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
