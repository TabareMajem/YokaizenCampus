/// <reference types="vite/client" />

import { UserStats } from '../types';
import { audio } from './audioService';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    condition: (user: UserStats, gameStats?: any) => boolean;
    rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    xpReward: number;
}

export const BADGES: Badge[] = [
    // --- RANK BADGES ---
    {
        id: 'rank_operative',
        name: 'Operative Status',
        description: 'Begin your journey as an official Yokaizen Operative.',
        icon: 'badge_rank_operative.png',
        rarity: 'COMMON',
        xpReward: 100,
        condition: (u) => u.level >= 1
    },
    {
        id: 'rank_silver',
        name: 'Silver Agent',
        description: 'Prove your worth. Reach Level 5.',
        icon: 'badge_rank_silver.png',
        rarity: 'RARE',
        xpReward: 500,
        condition: (u) => u.level >= 5
    },
    {
        id: 'rank_gold',
        name: 'Gold Agent',
        description: 'Elite status achieved. Reach Level 10.',
        icon: 'badge_rank_gold.png',
        rarity: 'EPIC',
        xpReward: 1000,
        condition: (u) => u.level >= 10
    },
    {
        id: 'rank_platinum',
        name: 'Platinum Legend',
        description: 'Legendary status. Reach Level 20.',
        icon: 'badge_rank_platinium.png',
        rarity: 'LEGENDARY',
        xpReward: 5000,
        condition: (u) => u.level >= 20
    },

    // --- SKILL BADGES ---
    {
        id: 'skill_prompting',
        name: 'Prompt Engineer',
        description: 'Master the art of checking prompts.',
        icon: 'badge_skill_prompting.png',
        rarity: 'COMMON',
        xpReward: 250,
        condition: (u) => (u.gameScores?.['prompt-architect'] || 0) > 80
    },
    {
        id: 'skill_debugging',
        name: 'Bug Hunter',
        description: 'Squash bugs in the code matrix.',
        icon: 'badge_skill_debugging.png',
        rarity: 'RARE',
        xpReward: 300,
        condition: (u) => (u.gameScores?.['latent-voyager'] || 0) > 1000 // Placeholder logic
    },
    {
        id: 'skill_data',
        name: 'Data Scientist',
        description: 'Analyze the flow of information.',
        icon: 'badge_skill_data.png',
        rarity: 'RARE',
        xpReward: 300,
        condition: (u) => (u.gameScores?.['glitchwave'] || 0) > 500
    },
    {
        id: 'skill_creation',
        name: 'Creative Spark',
        description: 'Generate something unique.',
        icon: 'badge_skill_creation.png',
        rarity: 'EPIC',
        xpReward: 600,
        condition: (u) => (u.createdGames && u.createdGames.length > 0)
    },
    {
        id: 'skill_ethics',
        name: 'Ethics Guardian',
        description: 'Make the right choices.',
        icon: 'badge_skill_ethics.png',
        rarity: 'EPIC',
        xpReward: 700,
        condition: (u) => (u.gameScores?.['bias-bingo'] || 0) > 80
    },

    // --- GAME SPECIFIC BADGES ---
    {
        id: 'game_climate',
        name: 'Time Traveler',
        description: 'Save the timeline in Climate Time Machine.',
        icon: 'badge_game_climate.png',
        rarity: 'EPIC',
        xpReward: 800,
        condition: (u) => (u.gameScores?.['climate-time'] || 0) > 2000
    },
    {
        id: 'game_defence',
        name: 'Tower Commander',
        description: 'Defend the core in Defense Strategist.',
        icon: 'badge_game_defence.png',
        rarity: 'RARE',
        xpReward: 400,
        condition: (u) => (u.gameScores?.['defense-strategist'] || 0) > 1500
    },
    {
        id: 'game_smartcity',
        name: 'City Planner',
        description: 'Build a thriving metropolis.',
        icon: 'badge_game_smartcity.png',
        rarity: 'RARE',
        xpReward: 400,
        condition: (u) => (u.gameScores?.['smart-city'] || 0) > 1000
    },
    {
        id: 'game_space',
        name: 'Void Explorer',
        description: 'Navigate the deep cosmos.',
        icon: 'badge_game_space.png',
        rarity: 'LEGENDARY',
        xpReward: 1000,
        condition: (u) => (u.gameScores?.['space-mission'] || 0) > 5000
    },
    {
        id: 'game_wallstreet',
        name: 'Market Mover',
        description: 'Dominate the trading floor.',
        icon: 'badge_game_wallstreet.png',
        rarity: 'EPIC',
        xpReward: 900,
        condition: (u) => (u.gameScores?.['wall-street'] || 0) > 100000
    },
    {
        id: 'game_racing',
        name: 'Speed Demon',
        description: 'Break the sound barrier in Neon Drift.',
        icon: 'badge_game_racing.png',
        rarity: 'RARE',
        xpReward: 300,
        condition: (u) => (u.gameScores?.['neon-drift'] || 0) > 5000
    },
    {
        id: 'game_protein',
        name: 'Bio Engineer',
        description: 'Fold the perfect protein.',
        icon: 'badge_game_protein.png',
        rarity: 'RARE',
        xpReward: 350,
        condition: (u) => (u.gameScores?.['protein-poker'] || 0) > 500
    }
];


export const badgeService = {
    checkBadges: (user: UserStats): Badge[] => {
        const unlocked: Badge[] = [];
        const currentBadges = user.badges || [];

        BADGES.forEach(badge => {
            if (!currentBadges.includes(badge.id)) {
                if (badge.condition(user)) {
                    unlocked.push(badge);
                }
            }
        });

        return unlocked;
    },

    // Fetch badges from backend (Phase 20)
    // In a real implementation, this would replace the hardcoded BADGES list
    // efficiently, or merge with it.
    syncBadges: async (token: string): Promise<Badge[]> => {
        try {
            // We can fetch from correct URL based on environment
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7792/api/v1';
            const res = await fetch(`${API_BASE}/user/badges`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Here we could update the local BADGES storage or return them
                console.log("Synced badges from backend:", data);
                return data.data;
            }
        } catch (e) {
            console.warn("Failed to sync badges", e);
        }
        return [];
    }
};
