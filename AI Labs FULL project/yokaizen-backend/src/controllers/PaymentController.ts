import { Request, Response } from 'express';
import { paymentService } from '@services/PaymentService';
import { asyncHandler, successResponse } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';

export class PaymentController {
  /**
   * POST /payments/create-checkout-session
   * Create a Stripe checkout session for subscription
   */
  createCheckoutSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { planId } = req.body;

    const result = await paymentService.createCheckoutSession(
      req.user!.userId,
      planId
    );

    res.json(successResponse(result));
  });

  /**
   * POST /payments/portal
   * Create Stripe customer portal session
   */
  createPortalSession = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await paymentService.createPortalSession(req.user!.userId);
    res.json(successResponse(result));
  });

  /**
   * POST /payments/webhook
   * Handle Stripe webhooks
   */
  webhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({ error: 'Missing signature' });
      return;
    }

    try {
      // req.body is raw buffer for webhook verification
      await paymentService.handleWebhook(req.body, signature);
      res.json({ received: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * POST /payments/credits
   * Purchase credits
   */
  purchaseCredits = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { amount } = req.body;

    const result = await paymentService.purchaseCredits(req.user!.userId, amount);
    res.json(successResponse(result));
  });

  /**
   * GET /payments/transactions
   * Get transaction history
   */
  getTransactions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = '1', limit = '20' } = req.query;

    const result = await paymentService.getTransactionHistory(
      req.user!.userId,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(successResponse({
      transactions: result.transactions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit as string)),
      },
    }));
  });

  /**
   * GET /payments/subscription
   * Get current subscription status
   */
  getSubscription = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would typically fetch from Stripe and/or DB
    res.json(successResponse({
      tier: req.user!.tier,
      // Additional subscription details would come from the user service
    }));
  });

  /**
   * POST /payments/cancel-subscription
   * Cancel subscription (redirects to portal for actual cancellation)
   */
  cancelSubscription = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await paymentService.createPortalSession(req.user!.userId);
    res.json(successResponse({
      message: 'Redirect to portal to manage subscription',
      ...result,
    }));
  });
}

export const paymentController = new PaymentController();
