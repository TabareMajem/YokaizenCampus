import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { SquadManager } from '../components/SquadManager';
import { Leaderboard } from '../components/Leaderboard';

interface LeaderboardPageProps {
    mobileLeaderboardView: 'RANKING' | 'SQUAD';
    setMobileLeaderboardView: (v: 'RANKING' | 'SQUAD') => void;
    squads: any[];
    user: any;
    handleJoinSquad: (id: string) => void;
    handleCreateSquad: (name: string, avatar: string) => void;
    setShowPaywall: (v: boolean) => void;
    t: (k: string, r?: any) => string;
    updateUser: (u: any) => void;
    setSquads: (s: any[]) => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({
    mobileLeaderboardView, setMobileLeaderboardView, squads, user, handleJoinSquad,
    handleCreateSquad, setShowPaywall, t, updateUser, setSquads
}) => {
    return (
        <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }} className="flex flex-col h-full">
            {/* Mobile Toggle */}
            <div className="md:hidden flex border-b border-white/10">
                <button
                    className={`flex-1 py-3 text-xs font-bold uppercase ${mobileLeaderboardView === 'RANKING' ? 'text-electric border-b-2 border-electric' : 'text-gray-500'}`}
                    onClick={() => setMobileLeaderboardView('RANKING')}
                >
                    {t('leaderboard.global')}
                </button>
                <button
                    className={`flex-1 py-3 text-xs font-bold uppercase ${mobileLeaderboardView === 'SQUAD' ? 'text-electric border-b-2 border-electric' : 'text-gray-500'}`}
                    onClick={() => setMobileLeaderboardView('SQUAD')}
                >
                    {t('leaderboard.squad')}
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className={`flex-1 border-r border-white/10 ${mobileLeaderboardView === 'SQUAD' ? 'block' : 'hidden md:block'}`}>
                    <SquadManager
                        squads={squads}
                        userSquadId={user.squadId}
                        onJoinSquad={handleJoinSquad}
                        onCreateSquad={handleCreateSquad}
                        isPro={user.isPro}
                        onTriggerPaywall={() => setShowPaywall(true)}
                        t={t}
                        user={user}
                        onUpdateUser={updateUser}
                        onUpdateSquads={setSquads}
                    />
                </div>
                <div className={`flex-1 h-full ${mobileLeaderboardView === 'RANKING' ? 'block' : 'hidden md:block'}`}>
                    <Leaderboard />
                </div>
            </div>
        </motion.div>
    );
};
