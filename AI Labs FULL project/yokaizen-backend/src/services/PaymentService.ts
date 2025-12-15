import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { AppDataSource } from '@config/database';
import { config } from '@config/env';
import { stripe, createCheckoutSession, createPortalSession, PLAN_CONFIG } from '@config/stripe';
import { logger, paymentLogger } from '@config/logger';
import { User, UserTier } from '@entities/User';
import { Transaction, TransactionType, TransactionStatus } from '@entities/Transaction';
import { ApiError } from '@utils/errors';

interface CheckoutResult {
  sessionId: string;
  url: string;
}

interface PortalResult {
  url: string;
}

export class PaymentService {
  private userRepository: Repository<User>;
  private transactionRepository: Repository<Transaction>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
  }

  async createCheckoutSession(
    userId: string,
    planId: 'OPERATIVE' | 'PRO_CREATOR'
  ): Promise<CheckoutResult> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw ApiError.notFound('User not found');

    // Check if user already has this tier
    if (user.tier === planId || (user.tier === UserTier.PRO_CREATOR && planId === 'OPERATIVE')) {
      throw ApiError.badRequest('User already has this or higher tier');
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId: user.id },
        phone: user.phone || undefined,
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await this.userRepository.save(user);
    }

    const priceId = planId === 'OPERATIVE'
      ? config.stripe.operativePriceId
      : config.stripe.proPriceId;

    const session = await createCheckoutSession(
      customerId,
      priceId,
      `${config.app.frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      `${config.app.frontendUrl}/subscription/cancel`
    );

    paymentLogger.info('Checkout session created', {
      userId,
      planId,
      sessionId: session.id,
    });

    // Create pending transaction
    const transaction = this.transactionRepository.create({
      user,
      type: TransactionType.SUBSCRIPTION,
      amount: PLAN_CONFIG[planId].price,
      currency: 'JPY',
      status: TransactionStatus.PENDING,
      stripeSessionId: session.id,
      metadata: { planId },
    });
    await this.transactionRepository.save(transaction);

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  async createPortalSession(userId: string): Promise<PortalResult> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw ApiError.notFound('User not found');

    if (!user.stripeCustomerId) {
      throw ApiError.badRequest('No billing account found');
    }

    const session = await createPortalSession(
      user.stripeCustomerId,
      `${config.app.frontendUrl}/settings/billing`
    );

    paymentLogger.info('Portal session created', { userId });

    return { url: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );
    } catch (error) {
      paymentLogger.error('Webhook signature verification failed', { error });
      throw ApiError.badRequest('Invalid webhook signature');
    }

    paymentLogger.info('Webhook received', { type: event.type, id: event.id });

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        paymentLogger.info('Unhandled webhook event', { type: event.type });
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    const user = await this.userRepository.findOne({
      where: { stripeCustomerId: customerId },
    });

    if (!user) {
      paymentLogger.error('User not found for checkout', { customerId });
      return;
    }

    // Update transaction
    const transaction = await this.transactionRepository.findOne({
      where: { stripeSessionId: session.id },
    });

    if (transaction) {
      transaction.status = TransactionStatus.COMPLETED;
      transaction.stripePaymentId = session.payment_intent as string;
      await this.transactionRepository.save(transaction);
    }

    // Get subscription details to determine tier
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;

    let newTier: UserTier;

    // Handle cross-product subscription access
    // price_1SciDhCm2Xw209Q2Yzrj35SW = Campus + AI Labs Creator ($9.90)
    // price_1SciFPCm2Xw209Q2GzeUvuYz = AI Labs Operative ($4.90)
    if (priceId === config.stripe.proPriceId) {
      // Campus + AI Labs Creator - both products access
      newTier = UserTier.PRO_CREATOR;
      user.campusAccess = true;
      user.aiLabsAccess = true;
      user.subscriptionProduct = 'campus_plus_labs';
    } else if (priceId === config.stripe.operativePriceId) {
      // AI Labs Operative - AI Labs only
      newTier = UserTier.OPERATIVE;
      user.campusAccess = false;
      user.aiLabsAccess = true;
      user.subscriptionProduct = 'ai_labs_only';
    } else {
      newTier = UserTier.FREE;
      user.campusAccess = false;
      user.aiLabsAccess = false;
      user.subscriptionProduct = null;
    }

    // Update user
    user.tier = newTier;
    user.stripeSubscriptionId = subscriptionId;
    user.subscriptionExpiresAt = new Date(subscription.current_period_end * 1000);

    // Upgrade benefits
    if (newTier === UserTier.PRO_CREATOR) {
      user.maxEnergy = 200;
    } else if (newTier === UserTier.OPERATIVE) {
      user.maxEnergy = 150;
    }

    await this.userRepository.save(user);

    paymentLogger.info('Subscription activated with cross-product access', {
      userId: user.id,
      tier: newTier,
      subscriptionId,
      campusAccess: user.campusAccess,
      aiLabsAccess: user.aiLabsAccess,
      subscriptionProduct: user.subscriptionProduct,
    });
  }

  private async handleInvoiceSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription as string;

    const user = await this.userRepository.findOne({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    // Create transaction record
    const transaction = this.transactionRepository.create({
      user,
      type: TransactionType.SUBSCRIPTION,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      status: TransactionStatus.COMPLETED,
      stripePaymentId: invoice.payment_intent as string,
      metadata: { invoiceId: invoice.id },
    });
    await this.transactionRepository.save(transaction);

    // Update subscription end date
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      user.subscriptionExpiresAt = new Date(subscription.current_period_end * 1000);
      await this.userRepository.save(user);
    }

    paymentLogger.info('Invoice paid', {
      userId: user.id,
      amount: invoice.amount_paid,
    });
  }

  private async handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    const user = await this.userRepository.findOne({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    // Create failed transaction record
    const transaction = this.transactionRepository.create({
      user,
      type: TransactionType.SUBSCRIPTION,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      status: TransactionStatus.FAILED,
      metadata: { invoiceId: invoice.id, failureReason: 'payment_failed' },
    });
    await this.transactionRepository.save(transaction);

    paymentLogger.warn('Invoice payment failed', {
      userId: user.id,
      invoiceId: invoice.id,
    });

    // TODO: Send notification to user about failed payment
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    const user = await this.userRepository.findOne({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    const priceId = subscription.items.data[0]?.price.id;

    let newTier: UserTier;
    if (priceId === config.stripe.proPriceId) {
      newTier = UserTier.PRO_CREATOR;
      user.maxEnergy = 200;
    } else if (priceId === config.stripe.operativePriceId) {
      newTier = UserTier.OPERATIVE;
      user.maxEnergy = 150;
    } else {
      newTier = UserTier.FREE;
      user.maxEnergy = 100;
    }

    user.tier = newTier;
    user.subscriptionExpiresAt = new Date(subscription.current_period_end * 1000);
    await this.userRepository.save(user);

    paymentLogger.info('Subscription updated', {
      userId: user.id,
      tier: newTier,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    const user = await this.userRepository.findOne({
      where: { stripeCustomerId: customerId },
    });

    if (!user) return;

    // Downgrade to free tier
    user.tier = UserTier.FREE;
    user.maxEnergy = 100;
    user.stripeSubscriptionId = null;
    user.subscriptionExpiresAt = null;
    await this.userRepository.save(user);

    paymentLogger.info('Subscription cancelled', { userId: user.id });
  }

  async purchaseCredits(userId: string, amount: number): Promise<CheckoutResult> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw ApiError.notFound('User not found');

    // Credit packages
    const packages: Record<number, number> = {
      500: 500,    // ¥500 = 500 credits
      1000: 1100,  // ¥1000 = 1100 credits (10% bonus)
      3000: 3500,  // ¥3000 = 3500 credits (17% bonus)
    };

    if (!packages[amount]) {
      throw ApiError.badRequest('Invalid credit package');
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await this.userRepository.save(user);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `${packages[amount]} Credits`,
            description: `Yokaizen virtual credits`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      success_url: `${config.app.frontendUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.app.frontendUrl}/credits/cancel`,
      metadata: {
        type: 'credit_purchase',
        userId: user.id,
        credits: packages[amount].toString(),
      },
    });

    // Create pending transaction
    const transaction = this.transactionRepository.create({
      user,
      type: TransactionType.CREDIT_PURCHASE,
      amount,
      currency: 'JPY',
      status: TransactionStatus.PENDING,
      stripeSessionId: session.id,
      metadata: { credits: packages[amount] },
    });
    await this.transactionRepository.save(transaction);

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { transactions, total };
  }
}

export const paymentService = new PaymentService();
