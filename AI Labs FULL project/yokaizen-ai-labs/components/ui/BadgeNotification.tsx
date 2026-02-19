
import React, { useEffect, useState } from 'react';
import { Badge } from '../../services/badgeService';
import { Trophy, X } from 'lucide-react';
import { audio } from '../../services/audioService';

interface BadgeNotificationProps {
    badge: Badge | null;
    onClose: () => void;
}

export const BadgeNotification: React.FC<BadgeNotificationProps> = ({ badge, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (badge) {
            setVisible(true);
            audio.playSuccess();
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onClose, 500); // Wait for exit animation
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [badge, onClose]);

    if (!badge && !visible) return null;

    const rarityColors = {
        'COMMON': 'border-gray-500 bg-gray-900',
        'RARE': 'border-blue-500 bg-blue-900',
        'EPIC': 'border-purple-500 bg-purple-900',
        'LEGENDARY': 'border-amber-500 bg-amber-900'
    };

    const rarityGlow = {
        'COMMON': 'shadow-gray-500/50',
        'RARE': 'shadow-blue-500/50',
        'EPIC': 'shadow-purple-500/50',
        'LEGENDARY': 'shadow-amber-500/50'
    };

    return (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
            <div className={`relative ${rarityColors[badge!.rarity]} p-1 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] ${rarityGlow[badge!.rarity]} border-2 overflow-hidden w-96`}>
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 animate-shimmer pointer-events-none"></div>

                <div className="bg-black/80 rounded-xl p-4 flex items-center space-x-4 backdrop-blur-xl relative z-10">
                    <div className="w-16 h-16 flex items-center justify-center text-4xl bg-black rounded-lg border border-white/10 shadow-inner">
                        {badge?.icon}
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 flex justify-between">
                            <span>Badge Unlocked</span>
                            <span className={`${badge!.rarity === 'LEGENDARY' ? 'text-amber-400 animate-pulse' : 'text-white/50'}`}>{badge?.rarity}</span>
                        </div>
                        <h3 className="text-xl font-black text-white italic">{badge?.name}</h3>
                        <p className="text-xs text-gray-400 leading-tight mt-1">{badge?.description}</p>
                    </div>
                    <div className="text-center">
                        <div className="text-xs font-bold text-electric">+{badge?.xpReward}</div>
                        <div className="text-[8px] text-gray-500 uppercase">XP</div>
                    </div>
                </div>

                <button onClick={() => setVisible(false)} className="absolute top-2 right-2 text-white/20 hover:text-white z-20">
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};
