import { Router, raw } from 'express';
import { paymentController } from '@controllers/PaymentController';
import { authenticate } from '@middleware/auth';
import { validate, validatePagination } from '@middleware/validation';
import { rateLimit } from '@middleware/rateLimit';
import { paymentSchemas } from '@utils/validators';

const router = Router();

// Webhook endpoint - must be before authenticate middleware
// Uses raw body for signature verification
router.post(
  '/webhook',
  raw({ type: 'application/json' }),
  paymentController.webhook
);

// Protected routes
router.use(authenticate);

// Create checkout session for subscription
router.post(
  '/create-checkout-session',
  rateLimit({ keyPrefix: 'payment:checkout', maxRequests: 5, windowMs: 60000 }),
  validate(paymentSchemas.createCheckout),
  paymentController.createCheckoutSession
);

// Create customer portal session
router.post(
  '/portal',
  rateLimit({ keyPrefix: 'payment:portal', maxRequests: 10, windowMs: 60000 }),
  paymentController.createPortalSession
);

// Purchase credits
router.post(
  '/credits',
  rateLimit({ keyPrefix: 'payment:credits', maxRequests: 5, windowMs: 60000 }),
  validate(paymentSchemas.purchaseCredits),
  paymentController.purchaseCredits
);

// Get transaction history
router.get('/transactions', validatePagination, paymentController.getTransactions);

// Get subscription status
router.get('/subscription', paymentController.getSubscription);

// Cancel subscription (redirects to portal)
router.post('/cancel-subscription', paymentController.cancelSubscription);

export default router;
