import React from 'react';
import { Flame, Gift, Star, Zap, Trophy, Crown } from 'lucide-react';

interface StreakRewardsProps {
    currentStreak: number;
    onClose: () => void;
    onClaim?: () => void;
}

const STREAK_TIERS = [
    { days: 3, reward: '+50% XP for 24h', icon: Zap, color: 'from-blue-500 to-cyan-500' },
    { days: 7, reward: 'Exclusive "Dedicated" Badge', icon: Star, color: 'from-purple-500 to-pink-500' },
    { days: 14, reward: '1 Day Pro Access', icon: Gift, color: 'from-orange-500 to-red-500' },
    { days: 30, reward: '500 Credits + "Legend" Badge', icon: Crown, color: 'from-yellow-400 to-orange-500' },
];

export const StreakRewards: React.FC<StreakRewardsProps> = ({ currentStreak, onClose, onClaim }) => {
    const nextMilestone = STREAK_TIERS.find(t => t.days > currentStreak) || STREAK_TIERS[STREAK_TIERS.length - 1];
    const daysToNext = Math.max(0, nextMilestone.days - currentStreak);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[150] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                {/* Header with Flame */}
                <div className="relative p-6 bg-gradient-to-br from-orange-600/30 to-red-600/30 border-b border-white/10 text-center">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(255,100,0,0.5)]">
                        <Flame size={40} className="text-white" />
                    </div>
                    <div className="text-5xl font-black text-white mb-1">{currentStreak}</div>
                    <div className="text-orange-300 font-bold uppercase tracking-widest text-sm">Day Streak 🔥</div>
                </div>

                {/* Progress to Next */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-400 text-sm">Next Reward</span>
                        <span className="text-white font-bold text-sm">{daysToNext} days away</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (currentStreak / nextMilestone.days) * 100)}%` }}
                        />
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                        <nextMilestone.icon size={20} className="text-orange-400" />
                        <span className="text-white text-sm">{nextMilestone.reward}</span>
                    </div>
                </div>

                {/* All Tiers */}
                <div className="p-4 space-y-2 max-h-48 overflow-y-auto">
                    {STREAK_TIERS.map((tier, i) => {
                        const Icon = tier.icon;
                        const isUnlocked = currentStreak >= tier.days;
                        const isCurrent = currentStreak >= tier.days && (i === STREAK_TIERS.length - 1 || currentStreak < STREAK_TIERS[i + 1].days);

                        return (
                            <div
                                key={tier.days}
                                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isUnlocked ? 'bg-gradient-to-r opacity-100' : 'bg-white/5 opacity-50'
                                    } ${isCurrent ? tier.color : ''}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-white/20' : 'bg-white/10'}`}>
                                    <Icon size={18} className={isUnlocked ? 'text-white' : 'text-gray-500'} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-white font-bold text-sm">{tier.days} Day Streak</div>
                                    <div className="text-gray-400 text-xs">{tier.reward}</div>
                                </div>
                                {isUnlocked && <Trophy size={16} className="text-yellow-400" />}
                            </div>
                        );
                    })}
                </div>

                {/* Close Button */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-electric transition-colors"
                    >
                        Keep Playing
                    </button>
                </div>
            </div>
        </div>
    );
};
