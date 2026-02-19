
import { AppDataSource } from "../config/database";
import { Badge } from "../entities/Badge";

const BADGES_DATA = [
    // --- RANK BADGES ---
    {
        slug: 'rank_operative',
        name: 'Operative Status',
        description: 'Begin your journey as an official Yokaizen Operative.',
        icon: 'badge_rank_operative.png',
        rarity: 'COMMON',
        xpReward: 100
    },
    {
        slug: 'rank_silver',
        name: 'Silver Agent',
        description: 'Prove your worth. Reach Level 5.',
        icon: 'badge_rank_silver.png',
        rarity: 'RARE',
        xpReward: 500
    },
    {
        slug: 'rank_gold',
        name: 'Gold Agent',
        description: 'Elite status achieved. Reach Level 10.',
        icon: 'badge_rank_gold.png',
        rarity: 'EPIC',
        xpReward: 1000
    },
    {
        slug: 'rank_platinum',
        name: 'Platinum Legend',
        description: 'Legendary status. Reach Level 20.',
        icon: 'badge_rank_platinium.png',
        rarity: 'LEGENDARY',
        xpReward: 5000
    },
    // --- SKILL BADGES ---
    {
        slug: 'skill_prompting',
        name: 'Prompt Engineer',
        description: 'Master the art of checking prompts.',
        icon: 'badge_skill_prompting.png',
        rarity: 'COMMON',
        xpReward: 250
    },
    {
        slug: 'skill_debugging',
        name: 'Bug Hunter',
        description: 'Squash bugs in the code matrix.',
        icon: 'badge_skill_debugging.png',
        rarity: 'RARE',
        xpReward: 300
    },
    {
        slug: 'skill_data',
        name: 'Data Scientist',
        description: 'Analyze the flow of information.',
        icon: 'badge_skill_data.png',
        rarity: 'RARE',
        xpReward: 300
    },
    {
        slug: 'skill_creation',
        name: 'Creative Spark',
        description: 'Generate something unique.',
        icon: 'badge_skill_creation.png',
        rarity: 'EPIC',
        xpReward: 600
    },
    {
        slug: 'skill_ethics',
        name: 'Ethics Guardian',
        description: 'Make the right choices.',
        icon: 'badge_skill_ethics.png',
        rarity: 'EPIC',
        xpReward: 700
    },
    // --- GAME SPECIFIC BADGES ---
    {
        slug: 'game_climate',
        name: 'Time Traveler',
        description: 'Save the timeline in Climate Time Machine.',
        icon: 'badge_game_climate.png',
        rarity: 'EPIC',
        xpReward: 800
    },
    {
        slug: 'game_defence',
        name: 'Tower Commander',
        description: 'Defend the core in Defense Strategist.',
        icon: 'badge_game_defence.png',
        rarity: 'RARE',
        xpReward: 400
    },
    {
        slug: 'game_smartcity',
        name: 'City Planner',
        description: 'Build a thriving metropolis.',
        icon: 'badge_game_smartcity.png',
        rarity: 'RARE',
        xpReward: 400
    },
    {
        slug: 'game_space',
        name: 'Void Explorer',
        description: 'Navigate the deep cosmos.',
        icon: 'badge_game_space.png',
        rarity: 'LEGENDARY',
        xpReward: 1000
    },
    {
        slug: 'game_wallstreet',
        name: 'Market Mover',
        description: 'Dominate the trading floor.',
        icon: 'badge_game_wallstreet.png',
        rarity: 'EPIC',
        xpReward: 900
    },
    {
        slug: 'game_racing',
        name: 'Speed Demon',
        description: 'Break the sound barrier in Neon Drift.',
        icon: 'badge_game_racing.png',
        rarity: 'RARE',
        xpReward: 300
    },
    {
        slug: 'game_protein',
        name: 'Bio Engineer',
        description: 'Fold the perfect protein.',
        icon: 'badge_game_protein.png',
        rarity: 'RARE',
        xpReward: 350
    }
];

export const seedBadges = async () => {
    const badgeRepo = AppDataSource.getRepository(Badge);

    for (const data of BADGES_DATA) {
        const existing = await badgeRepo.findOne({ where: { slug: data.slug } });
        if (!existing) {
            const badge = badgeRepo.create(data as any);
            await badgeRepo.save(badge);
            console.log(`Created badge: ${data.name}`);
        } else {
            existing.name = data.name;
            existing.description = data.description;
            existing.icon = data.icon;
            existing.rarity = data.rarity as any;
            existing.xpReward = data.xpReward;
            await badgeRepo.save(existing);
            console.log(`Updated badge: ${data.name}`);
        }
    }
};
