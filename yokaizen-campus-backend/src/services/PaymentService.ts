import Stripe from 'stripe';
import { prisma } from '../utils/prisma';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { SubscriptionTier } from '@prisma/client';
import { config } from '../config';

// Initialize Stripe
const stripe = new Stripe(config.stripe.secretKey || 'sk_test_placeholder', {
  apiVersion: '2024-11-20.acacia' as any
});

// Product/Price IDs - would come from Stripe Dashboard
const PRODUCTS = {
  PRO_MONTHLY: {
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    credits: 0, // Unlimited for Pro
    tier: SubscriptionTier.PRO
  },
  PRO_YEARLY: {
    priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
    credits: 0,
    tier: SubscriptionTier.PRO
  },
  CREDITS_100: {
    priceId: process.env.STRIPE_CREDITS_100_PRICE_ID || 'price_credits_100',
    credits: 100
  },
  CREDITS_500: {
    priceId: process.env.STRIPE_CREDITS_500_PRICE_ID || 'price_credits_500',
    credits: 500
  },
  CREDITS_1000: {
    priceId: process.env.STRIPE_CREDITS_1000_PRICE_ID || 'price_credits_1000',
    credits: 1000
  },
  PARENT_SPONSOR: {
    priceId: process.env.STRIPE_PARENT_SPONSOR_PRICE_ID || 'price_parent_sponsor',
    credits: 200
  }
};

interface CreateCheckoutInput {
  userId: string;
  productKey: keyof typeof PRODUCTS;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

interface CreateSponsorCheckoutInput {
  parentId: string;
  studentId: string;
  credits: number;
  successUrl: string;
  cancelUrl: string;
}

export class PaymentService {
  /**
   * Create a Stripe checkout session
   */
  async createCheckoutSession(input: CreateCheckoutInput) {
    const { userId, productKey, successUrl, cancelUrl, metadata = {} } = input;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeCustomerId: true }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const product = PRODUCTS[productKey];
    if (!product) {
      throw new AppError('Invalid product', 400);
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId }
      });
    }

    // Determine session mode
    const isSubscription = productKey.startsWith('PRO_');
    const mode = isSubscription ? 'subscription' : 'payment';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: product.priceId,
          quantity: 1
        }
      ],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        productKey,
        credits: product.credits?.toString() || '0',
        ...metadata
      }
    });

    // Log checkout initiation
    await prisma.auditLog.create({
      data: {
        userId,
        actionType: 'CHECKOUT_STARTED',
        details: `Started checkout for ${productKey}`,
        meta: { sessionId: session.id, productKey }
      }
    });

    return {
      sessionId: session.id,
      url: session.url
    };
  }

  /**
   * Create sponsor checkout (parent buying credits for student)
   */
  async createSponsorCheckout(input: CreateSponsorCheckoutInput) {
    const { parentId, studentId, credits, successUrl, cancelUrl } = input;

    // Verify parent-child relationship
    const relationship = await prisma.parentChild.findFirst({
      where: {
        parentId,
        childId: studentId
      }
    });

    if (!relationship) {
      throw new AppError('You are not authorized to sponsor this student', 403);
    }

    const parent = await prisma.user.findUnique({
      where: { id: parentId },
      select: { id: true, email: true, stripeCustomerId: true }
    });

    if (!parent) {
      throw new NotFoundError('Parent not found');
    }

    // Get or create Stripe customer
    let customerId = parent.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: parent.email,
        metadata: { userId: parent.id }
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: parentId },
        data: { stripeCustomerId: customerId }
      });
    }

    // Calculate price based on credits
    const pricePerCredit = 0.05; // $0.05 per credit
    const amount = Math.round(credits * pricePerCredit * 100); // In cents

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${credits} Credits for Student`,
              description: `Sponsor credits for learning`
            },
            unit_amount: amount
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: 'SPONSOR',
        parentId,
        studentId,
        credits: credits.toString()
      }
    });

    return {
      sessionId: session.id,
      url: session.url
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(payload: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret || 'whsec_placeholder'
      );
    } catch (err: any) {
      throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Get subscription status for user
   */
  async getSubscriptionStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        subscriptionTier: true,
        credits: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    let subscription = null;
    if (user.stripeSubscriptionId) {
      try {
        subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      } catch (error) {
        // Subscription might be deleted
        subscription = null;
      }
    }

    return {
      tier: user.subscriptionTier,
      credits: user.credits,
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      } : null
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true }
    });

    if (!user?.stripeSubscriptionId) {
      throw new AppError('No active subscription found', 400);
    }

    // Cancel at end of current period
    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    await prisma.auditLog.create({
      data: {
        userId,
        actionType: 'SUBSCRIPTION_CANCELED',
        details: 'User requested subscription cancellation',
        meta: { subscriptionId: subscription.id }
      }
    });

    return {
      status: subscription.status,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null
    };
  }

  /**
   * Resume canceled subscription
   */
  async resumeSubscription(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeSubscriptionId: true }
    });

    if (!user?.stripeSubscriptionId) {
      throw new AppError('No subscription found', 400);
    }

    const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false
    });

    await prisma.auditLog.create({
      data: {
        userId,
        actionType: 'SUBSCRIPTION_RESUMED',
        details: 'User resumed subscription',
        meta: { subscriptionId: subscription.id }
      }
    });

    return {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000)
    };
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId: string, limit: number = 10) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true }
    });

    if (!user?.stripeCustomerId) {
      return [];
    }

    const charges = await stripe.charges.list({
      customer: user.stripeCustomerId,
      limit
    });

    return charges.data.map(charge => ({
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency,
      status: charge.status,
      description: charge.description,
      created: new Date(charge.created * 1000)
    }));
  }

  // Private webhook handlers

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const { userId, productKey, credits, type, parentId, studentId } = session.metadata || {};

    if (type === 'SPONSOR' && parentId && studentId && credits) {
      // Parent sponsoring credits
      await prisma.user.update({
        where: { id: studentId },
        data: {
          credits: {
            increment: parseInt(credits)
          }
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: studentId,
          actionType: 'CREDITS_SPONSORED',
          details: `Received ${credits} credits from parent`,
          meta: { parentId, credits: parseInt(credits) }
        }
      });

      return;
    }

    if (!userId || !productKey) {
      console.error('Missing metadata in checkout session');
      return;
    }

    const product = PRODUCTS[productKey as keyof typeof PRODUCTS];
    if (!product) {
      console.error(`Unknown product: ${productKey}`);
      return;
    }

    // Handle subscription
    if (session.subscription && 'tier' in product) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: product.tier,
          stripeSubscriptionId: session.subscription as string
        }
      });

      await prisma.auditLog.create({
        data: {
          userId,
          actionType: 'SUBSCRIPTION_ACTIVATED',
          details: `Upgraded to ${product.tier}`,
          meta: { subscriptionId: String(session.subscription) }
        }
      });
    }

    // Handle credit purchase
    if (product.credits && product.credits > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: product.credits
          }
        }
      });

      await prisma.auditLog.create({
        data: {
          userId,
          actionType: 'CREDITS_PURCHASED',
          details: `Purchased ${product.credits} credits`,
          meta: { credits: product.credits }
        }
      });
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (!user) return;

    // Update subscription ID if changed
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionId: subscription.id,
        subscriptionTier: subscription.status === 'active' ? SubscriptionTier.PRO : SubscriptionTier.FREE
      }
    });
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    const customerId = subscription.customer as string;

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (!user) return;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: SubscriptionTier.FREE,
        stripeSubscriptionId: null
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        actionType: 'SUBSCRIPTION_ENDED',
        details: 'Subscription has ended',
        meta: { subscriptionId: subscription.id }
      }
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    // Log successful payment
    const customerId = invoice.customer as string;

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          actionType: 'INVOICE_PAID',
          details: `Invoice paid: ${invoice.amount_paid / 100} ${invoice.currency}`,
          meta: { invoiceId: invoice.id, amount: invoice.amount_paid }
        }
      });
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = invoice.customer as string;

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          actionType: 'PAYMENT_FAILED',
          details: 'Payment failed',
          meta: { invoiceId: invoice.id }
        }
      });
    }
  }
}

export const paymentService = new PaymentService();
