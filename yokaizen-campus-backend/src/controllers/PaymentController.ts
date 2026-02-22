import { Request, Response } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/PaymentService';
import { asyncHandler, ValidationError, ForbiddenError } from '../middleware/errorHandler';
import { config } from '../config';

// Validation schemas
const createCheckoutSchema = z.object({
  priceId: z.string().optional(),
  planType: z.enum(['PRO_MONTHLY', 'PRO_YEARLY', 'CREDITS_PACK_SMALL', 'CREDITS_PACK_MEDIUM', 'CREDITS_PACK_LARGE']).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

const createPortalSchema = z.object({
  returnUrl: z.string().url().optional()
});

const purchaseCreditsSchema = z.object({
  amount: z.number().int().min(100).max(10000),
  paymentMethodId: z.string().optional()
});

const sponsorStudentSchema = z.object({
  studentId: z.string().uuid(),
  credits: z.number().int().min(100).max(5000)
});

export class PaymentController {
  /**
   * POST /payment/checkout
   * Create a Stripe checkout session
   */
  createCheckout = asyncHandler(async (req: Request, res: Response) => {
    const validation = createCheckoutSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const session = await paymentService.createCheckoutSession({
      userId: req.user!.userId,
      ...validation.data
    } as any);

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        url: session.url
      }
    });
  });

  /**
   * POST /payment/portal
   * Create a Stripe billing portal session
   */
  createPortal = asyncHandler(async (req: Request, res: Response) => {
    const validation = createPortalSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const session = await paymentService.createPortalSession(
      req.user!.userId,
      validation.data.returnUrl
    );

    res.json({
      success: true,
      data: {
        url: session.url
      }
    });
  });

  /**
   * POST /payment/webhook
   * Handle Stripe webhooks
   */
  handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    if (!sig) {
      throw new ValidationError('Missing Stripe signature');
    }

    // Raw body is needed for webhook verification
    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      throw new ValidationError('Missing raw body for webhook verification');
    }

    await paymentService.handleWebhook(rawBody, sig);

    res.json({ received: true });
  });

  /**
   * GET /payment/subscription
   * Get current subscription status
   */
  getSubscription = asyncHandler(async (req: Request, res: Response) => {
    const subscription = await paymentService.getSubscription(req.user!.userId);

    res.json({
      success: true,
      data: subscription
    });
  });

  /**
   * POST /payment/subscription/cancel
   * Cancel subscription
   */
  cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
    const { immediately } = req.body;

    await paymentService.cancelSubscription(req.user!.userId);

    res.json({
      success: true,
      message: immediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at end of billing period'
    });
  });

  /**
   * POST /payment/subscription/resume
   * Resume a cancelled subscription
   */
  resumeSubscription = asyncHandler(async (req: Request, res: Response) => {
    await paymentService.resumeSubscription(req.user!.userId);

    res.json({
      success: true,
      message: 'Subscription resumed'
    });
  });

  /**
   * POST /payment/credits
   * Purchase credits directly
   */
  purchaseCredits = asyncHandler(async (req: Request, res: Response) => {
    const validation = purchaseCreditsSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await paymentService.purchaseCredits(
      req.user!.userId,
      validation.data.amount,
      validation.data.paymentMethodId
    );

    res.json({
      success: true,
      message: `Purchased ${validation.data.amount} credits`,
      data: result
    });
  });

  /**
   * GET /payment/credits
   * Get current credit balance
   */
  getCredits = asyncHandler(async (req: Request, res: Response) => {
    const credits = await paymentService.getCreditBalance(req.user!.userId);

    res.json({
      success: true,
      data: { credits }
    });
  });

  /**
   * GET /payment/history
   * Get payment history
   */
  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const { limit, offset } = req.query;

    const history = await paymentService.getPaymentHistory(
      req.user!.userId,
      limit ? parseInt(limit as string) : 20
    );

    res.json({
      success: true,
      data: history
    });
  });

  /**
   * GET /payment/invoices
   * Get invoices
   */
  getInvoices = asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query;

    const invoices = await paymentService.getInvoices(
      req.user!.userId,
      limit ? parseInt(limit as string) : 10
    );

    res.json({
      success: true,
      data: invoices
    });
  });

  /**
   * POST /payment/sponsor
   * Parent sponsors credits for a student
   */
  sponsorStudent = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'PARENT') {
      throw new ForbiddenError('Only parents can sponsor students');
    }

    const validation = sponsorStudentSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await paymentService.sponsorStudent(
      req.user!.userId,
      validation.data.studentId,
      validation.data.credits
    );

    res.json({
      success: true,
      message: `Sponsored ${validation.data.credits} credits`,
      data: result
    });
  });

  /**
   * GET /payment/plans
   * Get available subscription plans
   */
  getPlans = asyncHandler(async (req: Request, res: Response) => {
    const plans = await paymentService.getAvailablePlans();

    res.json({
      success: true,
      data: plans
    });
  });

  /**
   * POST /payment/payment-method
   * Add a new payment method
   */
  addPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    const { paymentMethodId, setAsDefault } = req.body;

    if (!paymentMethodId) {
      throw new ValidationError('Payment method ID is required');
    }

    await paymentService.addPaymentMethod(
      req.user!.userId,
      paymentMethodId,
      setAsDefault
    );

    res.json({
      success: true,
      message: 'Payment method added'
    });
  });

  /**
   * GET /payment/payment-methods
   * Get saved payment methods
   */
  getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
    const methods = await paymentService.getPaymentMethods(req.user!.userId);

    res.json({
      success: true,
      data: methods
    });
  });

  /**
   * DELETE /payment/payment-method/:id
   * Remove a payment method
   */
  removePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
    await paymentService.removePaymentMethod(req.user!.userId, req.params.id);

    res.json({
      success: true,
      message: 'Payment method removed'
    });
  });
}

export const paymentController = new PaymentController();
