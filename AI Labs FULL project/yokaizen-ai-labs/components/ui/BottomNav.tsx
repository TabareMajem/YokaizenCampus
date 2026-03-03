import React from 'react';
import { motion } from 'framer-motion';
import { Home, Gamepad2, FlaskConical, Rocket, User } from 'lucide-react';
import { AppTab } from '../../types';

interface BottomNavProps {
    activeTab: AppTab;
    handleTabSwitch: (tab: AppTab) => void;
    t: (key: string) => string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, handleTabSwitch, t }) => {
    const tabs = [
        { id: AppTab.HOME, icon: <Home size={22} strokeWidth={2.5} />, label: 'home' },
        { id: AppTab.LEARN, icon: <Gamepad2 size={22} strokeWidth={2.5} />, label: 'learn' },
        { id: AppTab.LAB, icon: <FlaskConical size={22} strokeWidth={2.5} />, label: 'lab' },
        { id: AppTab.GROWTH, icon: <Rocket size={22} strokeWidth={2.5} />, label: 'growth' },
        { id: AppTab.PROFILE, icon: <User size={22} strokeWidth={2.5} />, label: 'profile' }
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-2xl border-t border-white/10 pb-safe">
            <div className="flex justify-around items-end px-2 py-2 h-16">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabSwitch(tab.id)}
                            className="flex flex-col items-center justify-center w-16 relative group"
                        >
                            {/* Active Glow */}
                            {isActive && (
                                <motion.div
                                    layoutId="mobileNavGlow"
                                    className="absolute -top-4 w-8 h-1 bg-gradient-to-r from-cyan-400 to-electric rounded-b-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                                />
                            )}

                            <div className={`flex items-center justify-center mb-1 transition-transform ${isActive ? 'scale-110 text-electric drop-shadow-[0_0_8px_rgba(196,95,255,0.8)]' : 'scale-100 text-gray-500 opacity-80'}`}>
                                {tab.icon}
                            </div>

                            <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                {t(`nav.${tab.label}`)}
                            </span>
                        </button>
                    );
                })}
            </div>
            {/* Safe area padding for newer iPhones */}
            <div className="h-[env(safe-area-inset-bottom)] bg-transparent w-full"></div>
        </div>
    );
};
