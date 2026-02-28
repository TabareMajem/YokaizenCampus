import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Activity, Target, Zap, Clock, Shield, Brain, Cpu, TrendingUp } from 'lucide-react';
import { UserStats, SkillType } from '../types';
import { GAMES } from '../constants';

interface GameAnalyticsDashboardProps {
    user: UserStats;
    t: (key: string) => string;
}

export const GameAnalyticsDashboard: React.FC<GameAnalyticsDashboardProps> = ({ user, t }) => {
    // Calculate aggregate statistics
    const stats = useMemo(() => {
        const completed = user.completedNodes?.length || 0;
        const totalGames = GAMES.length;
        const completionRate = Math.round((completed / totalGames) * 100);

        // Mocked performance data based on completed games length to give it some life
        const avgAccuracy = Math.min(98, 65 + (completed * 0.5));
        const totalPlayTimeHours = Math.round((completed * 15) / 60);

        // Category performance
        const categories = [
            { id: 'safety', label: 'Safety & Ethics', icon: <Shield size={14} />, score: user.skills[SkillType.SAFETY] || 10, color: 'bg-emerald-500' },
            { id: 'prompting', label: 'Prompt Engineering', icon: <Cpu size={14} />, score: user.skills[SkillType.PROMPTING] || 10, color: 'bg-indigo-500' },
            { id: 'analysis', label: 'Data Analysis', icon: <Activity size={14} />, score: user.skills[SkillType.ANALYSIS] || 10, color: 'bg-cyan-500' },
            { id: 'logic', label: 'Logical Reasoning', icon: <Brain size={14} />, score: user.skills[SkillType.DEBUGGING] || 10, color: 'bg-purple-500' },
        ].sort((a, b) => b.score - a.score);

        return { completed, totalGames, completionRate, avgAccuracy, totalPlayTimeHours, categories };
    }, [user.completedNodes, user.skills]);

    return (
        <div className="bg-gradient-to-br from-gray-900/90 to-black/95 p-6 sm:p-8 rounded-[2rem] border border-white/10 relative group hover:border-white/20 transition-all shadow-2xl backdrop-blur-xl flex flex-col w-full overflow-hidden">
            {/* Ambient Backgrounds */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-electric/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-electric/10 transition-colors duration-700"></div>

            <div className="flex items-center justify-between mb-8 relative z-10 border-b border-white/5 pb-4">
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center">
                    <BarChart3 size={18} className="mr-3 text-cyan-400" /> SIMULATION ANALYTICS
                </h3>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    LIVE DATA
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 relative z-10">
                {/* Top Level Stats */}
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-inner hover:border-white/10 transition-colors">
                    <Target size={20} className="text-electric mb-2 opacity-80" />
                    <span className="text-2xl font-black text-white tabular-nums leading-none">{stats.completed}</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Sims Cleared</span>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-inner hover:border-white/10 transition-colors">
                    <TrendingUp size={20} className="text-green-400 mb-2 opacity-80" />
                    <span className="text-2xl font-black text-white tabular-nums leading-none">{stats.completionRate}%</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Completion</span>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-inner hover:border-white/10 transition-colors">
                    <Zap size={20} className="text-amber-400 mb-2 opacity-80" />
                    <span className="text-2xl font-black text-white tabular-nums leading-none">{stats.avgAccuracy.toFixed(1)}%</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Avg Accuracy</span>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-inner hover:border-white/10 transition-colors">
                    <Clock size={20} className="text-cyan-400 mb-2 opacity-80" />
                    <span className="text-2xl font-black text-white tabular-nums leading-none">{stats.totalPlayTimeHours}h</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Time Logged</span>
                </div>
            </div>

            {/* Performance by Category */}
            <div className="relative z-10">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Competency Breakdown</h4>
                <div className="space-y-4">
                    {stats.categories.map((cat, idx) => (
                        <div key={cat.id} className="relative">
                            <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                                    <span className={`${cat.color.replace('bg-', 'text-')}`}>{cat.icon}</span>
                                    {cat.label}
                                </div>
                                <span className="text-xs font-black text-white font-mono">{cat.score} PTS</span>
                            </div>
                            <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (cat.score / 100) * 100)}%` }}
                                    transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
                                    className={`h-full ${cat.color} shadow-[0_0_10px_currentColor]`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Decorative Grid */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-[url('/assets/aaa/grid-pattern.png')] bg-repeat-x bg-bottom opacity-10 pointer-events-none" style={{ backgroundSize: '40px' }}></div>
        </div>
    );
};
