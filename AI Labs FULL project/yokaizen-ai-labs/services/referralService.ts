/**
 * Referral Service — Manages the Yokai Viral Loop
 * Handles referral codes, tracking, tiers, and token rewards
 */

import { authService } from './authService';
import { ReferralTier, ReferralStats } from '../types';

const API_BASE = import.meta.env.PROD
    ? 'https://ai.yokaizencampus.com/api/v1'
    : 'http://localhost:7792/api/v1';

// ── Tier Definitions ──
export const REFERRAL_TIERS: ReferralTier[] = [
    {
        id: 1,
        label: 'Scout',
        emoji: '🌱',
        required: 1,
        reward: 50,
        perks: ['Access to 1 premium AI agent', 'Glow browser credits'],
        color: '#4ade80',
    },
    {
        id: 2,
        label: 'Summoner',
        emoji: '⚡',
        required: 5,
        reward: 300,
        perks: ['3 premium AI agents', 'Open Cloud tasks unlocked', 'Priority queue'],
        color: '#facc15',
    },
    {
        id: 3,
        label: 'Yokai Master',
        emoji: '🔥',
        required: 10,
        reward: 1000,
        perks: ['Unlimited agents', 'Custom Glow automations', 'Beta features', 'Leaderboard badge'],
        color: '#f97316',
    },
    {
        id: 4,
        label: 'Legend',
        emoji: '👑',
        required: 25,
        reward: 3000,
        perks: ['All above + co-creator status', 'Revenue share on referrals', 'Direct line to team'],
        color: '#a78bfa',
    },
];

// ── Helper Functions ──
export function getCurrentTier(referrals: number): ReferralTier | null {
    return [...REFERRAL_TIERS].reverse().find(t => referrals >= t.required) || null;
}

export function getNextTier(referrals: number): ReferralTier | null {
    return REFERRAL_TIERS.find(t => referrals < t.required) || null;
}

export function getTotalTokensForReferrals(referrals: number): number {
    return REFERRAL_TIERS
        .filter(t => referrals >= t.required)
        .reduce((acc, t) => acc + t.reward, 0);
}

export function generateReferralLink(code: string): string {
    const base = import.meta.env.PROD
        ? 'https://ai.yokaizencampus.com'
        : 'http://localhost:5173';
    return `${base}?ref=${code}`;
}

// ── API Methods ──
export const referralService = {
    /**
     * Get referral stats for the current user
     */
    async getStats(): Promise<ReferralStats> {
        const token = authService.getToken();
        if (!token) {
            return {
                referralCode: '',
                totalReferrals: 0,
                activeReferrals: 0,
                currentTier: null,
                nextTier: REFERRAL_TIERS[0],
                tokensEarned: 0,
                tokensAvailable: 0,
            };
        }

        try {
            const response = await fetch(`${API_BASE}/referrals/stats`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                // Fallback: generate a local referral code
                const userId = authService.getCurrentUser()?.uid || 'anon';
                const code = userId.slice(0, 8).toUpperCase();
                return {
                    referralCode: code,
                    totalReferrals: 0,
                    activeReferrals: 0,
                    currentTier: null,
                    nextTier: REFERRAL_TIERS[0],
                    tokensEarned: 0,
                    tokensAvailable: 0,
                };
            }

            const data = await response.json();
            const stats = data.data;
            const refs = stats.activeReferrals || 0;
            return {
                referralCode: stats.referralCode,
                totalReferrals: stats.totalReferrals || 0,
                activeReferrals: refs,
                currentTier: getCurrentTier(refs),
                nextTier: getNextTier(refs),
                tokensEarned: getTotalTokensForReferrals(refs),
                tokensAvailable: stats.tokensAvailable || 0,
            };
        } catch (error) {
            console.error('Error fetching referral stats:', error);
            const userId = authService.getCurrentUser()?.uid || 'anon';
            const code = userId.slice(0, 8).toUpperCase();
            return {
                referralCode: code,
                totalReferrals: 0,
                activeReferrals: 0,
                currentTier: null,
                nextTier: REFERRAL_TIERS[0],
                tokensEarned: 0,
                tokensAvailable: 0,
            };
        }
    },

    /**
     * Track a referral (called when a new user completes their first game)
     */
    async trackReferral(referrerCode: string): Promise<boolean> {
        const token = authService.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${API_BASE}/referrals/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ referrerCode }),
            });
            return response.ok;
        } catch (error) {
            console.error('Error tracking referral:', error);
            return false;
        }
    },

    /**
     * Claim a milestone reward
     */
    async claimMilestone(tierId: number): Promise<{ tokens: number } | null> {
        const token = authService.getToken();
        if (!token) return null;

        try {
            const response = await fetch(`${API_BASE}/referrals/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ tierId }),
            });

            if (!response.ok) return null;
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error claiming milestone:', error);
            return null;
        }
    },
};
