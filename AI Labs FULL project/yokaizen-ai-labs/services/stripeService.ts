/**
 * Stripe Service - Real Integration via Backend API
 * Connects to the AI Labs backend to handle Stripe payments
 */

import { authService } from './authService';

// API Base URL
const API_BASE = import.meta.env.PROD
    ? 'https://ai.yokaizencampus.com/api/v1'
    : 'http://localhost:7792/api/v1';

// Subscription plans matching Stripe price IDs
export const SUBSCRIPTION_PLANS = {
    OPERATIVE: {
        id: 'OPERATIVE',
        priceId: 'price_1SciFPCm2Xw209Q2GzeUvuYz',
        name: 'Ai Labs Operative',
        price: 490, // cents ($4.90)
        description: 'Access to AI Labs features only',
        features: [
            '20 AI generations per day',
            'All AI games unlocked',
            'Squad participation',
            'Priority support',
        ],
    },
    PRO_CREATOR: {
        id: 'PRO_CREATOR',
        priceId: 'price_1SciDhCm2Xw209Q2Yzrj35SW',
        name: 'Yokaizen Campus + AI Labs Creator',
        price: 990, // cents ($9.90)
        description: 'Full access to both Yokaizen Campus and AI Labs',
        features: [
            '50 AI generations per day',
            'Access to Yokaizen Campus',
            'Access to AI Labs',
            'Create custom AI games',
            'Advanced analytics',
            'Priority support',
        ],
    },
};

export const stripeService = {
    /**
     * Create a checkout session for subscription
     * Redirects user to Stripe Checkout
     */
    async createCheckoutSession(planId: 'OPERATIVE' | 'PRO_CREATOR'): Promise<string> {
        const token = authService.getToken();

        if (!token) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`${API_BASE}/payments/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ planId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create checkout session');
            }

            const data = await response.json();
            const { url } = data.data;

            // Redirect to Stripe Checkout
            if (url) {
                window.location.href = url;
                return url;
            }

            throw new Error('No checkout URL returned');
        } catch (error: any) {
            console.error('Checkout session error:', error);
            throw error;
        }
    },

    /**
     * Open Stripe Customer Portal for managing subscription
     */
    async openCustomerPortal(): Promise<void> {
        const token = authService.getToken();

        if (!token) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`${API_BASE}/payments/portal`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to open customer portal');
            }

            const data = await response.json();
            const { url } = data.data;

            // Redirect to Stripe Portal
            if (url) {
                window.location.href = url;
            }
        } catch (error: any) {
            console.error('Customer portal error:', error);
            throw error;
        }
    },

    /**
     * Get current subscription status
     */
    async getSubscription(): Promise<{
        tier: string;
        expiresAt: string | null;
        campusAccess: boolean;
        aiLabsAccess: boolean;
    }> {
        const token = authService.getToken();

        if (!token) {
            return {
                tier: 'FREE',
                expiresAt: null,
                campusAccess: false,
                aiLabsAccess: false,
            };
        }

        try {
            const response = await fetch(`${API_BASE}/payments/subscription`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to get subscription');
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Get subscription error:', error);
            return {
                tier: 'FREE',
                expiresAt: null,
                campusAccess: false,
                aiLabsAccess: false,
            };
        }
    },

    /**
     * Purchase credit pack (one-time)
     */
    async purchaseCredits(amount: 500 | 1000 | 3000): Promise<string> {
        const token = authService.getToken();

        if (!token) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`${API_BASE}/payments/credits`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ amount }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to purchase credits');
            }

            const data = await response.json();
            const { url } = data.data;

            if (url) {
                window.location.href = url;
                return url;
            }

            throw new Error('No checkout URL returned');
        } catch (error: any) {
            console.error('Credit purchase error:', error);
            throw error;
        }
    },

    /**
     * Get transaction history
     */
    async getTransactions(page: number = 1, limit: number = 20): Promise<{
        transactions: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const token = authService.getToken();

        if (!token) {
            return {
                transactions: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            };
        }

        try {
            const response = await fetch(`${API_BASE}/payments/transactions?page=${page}&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to get transactions');
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Get transactions error:', error);
            return {
                transactions: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            };
        }
    },

    /**
     * Get available subscription plans
     */
    getPlans() {
        return SUBSCRIPTION_PLANS;
    },

    /**
     * Check if user should see paywall for Campus access
     */
    needsCampusUpgrade(currentTier: string): boolean {
        // Only PRO_CREATOR tier has Campus access
        return currentTier !== 'PRO_CREATOR';
    },

    /**
     * Check if user should see paywall for AI Labs access
     */
    needsAiLabsUpgrade(currentTier: string): boolean {
        // Both OPERATIVE and PRO_CREATOR have AI Labs access
        return currentTier === 'FREE';
    },
};
