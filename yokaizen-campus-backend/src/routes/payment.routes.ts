import { Router } from 'express';
import { paymentController } from '../controllers';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Webhook (no auth - verified by Stripe signature)
router.post('/webhook', paymentController.handleWebhook);

// Protected routes
router.use(authenticate);

// Subscription management
router.post('/checkout', paymentController.createCheckout);
router.post('/portal', paymentController.createPortal);
router.get('/subscription', paymentController.getSubscription);
router.post('/subscription/cancel', paymentController.cancelSubscription);
router.post('/subscription/resume', paymentController.resumeSubscription);

// Credits
router.get('/credits', paymentController.getCredits);
router.post('/credits', paymentController.purchaseCredits);

// Payment history
router.get('/history', paymentController.getHistory);
router.get('/invoices', paymentController.getInvoices);

// Plans
router.get('/plans', paymentController.getPlans);

// Payment methods
router.get('/payment-methods', paymentController.getPaymentMethods);
router.post('/payment-method', paymentController.addPaymentMethod);
router.delete('/payment-method/:id', paymentController.removePaymentMethod);

// Parent sponsorship
router.post('/sponsor', requireRole(['PARENT']), paymentController.sponsorStudent);

export default router;
