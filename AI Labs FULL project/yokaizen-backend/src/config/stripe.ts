import Stripe from 'stripe';
import { config } from './env';

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const StripeConfig = {
  prices: {
    operative: config.stripe.operativePriceId,
    pro: config.stripe.proPriceId,
  },
  webhookSecret: config.stripe.webhookSecret,
};

// Plan configuration
export const PlanConfig = {
  FREE: {
    name: 'Free',
    tier: 'FREE' as const,
    credits: 100,
    aiRequestsPerMinute: 5,
    features: [
      'Basic AI chat',
      'Limited games',
      '100 credits/month',
    ],
  },
  OPERATIVE: {
    name: 'Operative',
    tier: 'OPERATIVE' as const,
    priceId: config.stripe.operativePriceId,
    credits: 1000,
    aiRequestsPerMinute: 20,
    features: [
      'Unlimited AI chat',
      'All games unlocked',
      '1000 credits/month',
      'Squad creation',
      'Custom agents',
    ],
  },
  PRO_CREATOR: {
    name: 'Pro Creator',
    tier: 'PRO_CREATOR' as const,
    priceId: config.stripe.proPriceId,
    credits: 5000,
    aiRequestsPerMinute: 50,
    features: [
      'Everything in Operative',
      '5000 credits/month',
      'Omni-Sight (Gemini Live)',
      'Game Creator',
      'Voice synthesis',
      'Image generation',
      'Priority support',
    ],
  },
};

// Create checkout session
export const createCheckoutSession = async (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> => {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata,
    },
  });
};

// Create customer portal session
export const createPortalSession = async (
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> => {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

// Create or retrieve Stripe customer
export const getOrCreateCustomer = async (
  email: string,
  name: string,
  userId: string
): Promise<Stripe.Customer> => {
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });
};

// Get subscription by customer ID
export const getActiveSubscription = async (
  customerId: string
): Promise<Stripe.Subscription | null> => {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });

  return subscriptions.data[0] || null;
};

// Cancel subscription
export const cancelSubscription = async (
  subscriptionId: string
): Promise<Stripe.Subscription> => {
  return stripe.subscriptions.cancel(subscriptionId);
};

// Construct webhook event
export const constructWebhookEvent = (
  payload: Buffer,
  signature: string
): Stripe.Event => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    config.stripe.webhookSecret
  );
};

// Get price ID for plan
export const getPriceIdForPlan = (planId: string): string | null => {
  switch (planId.toUpperCase()) {
    case 'OPERATIVE':
      return config.stripe.operativePriceId;
    case 'PRO':
    case 'PRO_CREATOR':
      return config.stripe.proPriceId;
    default:
      return null;
  }
};

// Get tier from price ID
export const getTierFromPriceId = (priceId: string): 'FREE' | 'OPERATIVE' | 'PRO_CREATOR' => {
  if (priceId === config.stripe.proPriceId) {
    return 'PRO_CREATOR';
  }
  if (priceId === config.stripe.operativePriceId) {
    return 'OPERATIVE';
  }
  return 'FREE';
};

export default stripe;
