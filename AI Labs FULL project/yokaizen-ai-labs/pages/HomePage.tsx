import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Award, Star, Search, CheckCircle, Lock, BookOpen, ChevronRight, Filter } from 'lucide-react';
import { AppTab, Difficulty, SkillType, GameDef } from '../types';
import { GAMES, TOOLS } from '../constants';
import { GameCover } from '../components/ui/GameCover';
import { Button } from '../components/ui/Button';

const CATEGORY_FILTERS: { key: string; label: string; skill?: SkillType }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'PROMPTING', label: 'Prompting', skill: SkillType.PROMPTING },
    { key: 'SAFETY', label: 'Safety', skill: SkillType.SAFETY },
    { key: 'ETHICS', label: 'Ethics', skill: SkillType.ETHICS },
    { key: 'ANALYSIS', label: 'Analysis', skill: SkillType.ANALYSIS },
    { key: 'CREATIVITY', label: 'Creativity', skill: SkillType.CREATIVITY },
    { key: 'DEBUGGING', label: 'Debugging', skill: SkillType.DEBUGGING },
];

interface HomePageProps {
    user: any;
    t: (key: string, replace?: any) => string;
    handleTabSwitch: (tab: AppTab) => void;
    handleGameLaunch: (game: GameDef) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ user, t, handleTabSwitch, handleGameLaunch }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | Difficulty>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'NEW'>('ALL');

    const nextLockedTool = TOOLS.find(tool => user && !user.unlockedTools.includes(tool.id) && (!tool.requiredBadgeId || !user.inventory.some((i: any) => i.id === tool.requiredBadgeId)));

    return (
        <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35, ease: [0.25, 0.8, 0.25, 1] }} className="p-6 pb-24 max-w-7xl mx-auto relative z-10">
            <div className="relative z-10 space-y-10">
                {/* ── AAA HERO STATUS CARD ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="relative rounded-[32px] overflow-hidden border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] group bg-black/40 backdrop-blur-2xl"
                >
                    {/* Atmospheric Background Layers */}
                    <div className="absolute inset-0 bg-[url('/assets/aaa/card-bg-1.png')] bg-cover bg-center opacity-30 mix-blend-screen transition-transform duration-1000 group-hover:scale-105"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-pink-900/30"></div>
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-electric/20 blur-[100px] rounded-full group-hover:bg-electric/30 transition-colors duration-700"></div>
                    <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/20 blur-[100px] rounded-full group-hover:bg-cyan-500/30 transition-colors duration-700"></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay"></div>

                    <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                        {/* Left Profile Section */}
                        <div className="flex items-center gap-8 w-full md:w-auto">
                            <div className="relative group/avatar cursor-pointer shrink-0" onClick={() => handleTabSwitch(AppTab.PROFILE)}>
                                {/* Avatar Glow Rings */}
                                <div className="absolute inset-[-10px] bg-gradient-to-tr from-cyan-400 via-electric to-pink-500 rounded-full blur-[20px] opacity-40 group-hover/avatar:opacity-70 transition-opacity duration-500 animate-[spin_4s_linear_infinite]"></div>
                                <div className="absolute inset-[-2px] bg-gradient-to-tr from-cyan-400 to-electric rounded-full z-0"></div>

                                <div className="relative w-32 h-32 rounded-full p-1 bg-black z-10 overflow-hidden transform group-hover/avatar:scale-95 transition-transform duration-300">
                                    <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="User Avatar" />
                                </div>

                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 10 }}
                                    className="absolute -bottom-2 -right-2 bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-full p-3 shadow-[0_10px_20px_rgba(0,0,0,0.5)] z-20"
                                >
                                    <Shield className="text-electric w-6 h-6 animate-pulse" />
                                </motion.div>
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1 rounded-full mb-3 backdrop-blur-sm">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                                    <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">System Online</span>
                                </div>
                                <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 uppercase tracking-tight drop-shadow-lg mb-2">
                                    {user.name}
                                </h2>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-300 font-mono">
                                    <div className="flex items-center gap-2 bg-electric/10 text-electric px-4 py-1.5 rounded-lg border border-electric/30 font-bold shadow-[0_0_15px_rgba(196,95,255,0.2)]">
                                        <Award size={16} /> Lvl {user.level}
                                    </div>
                                    <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-4 py-1.5 rounded-lg border border-amber-500/30 font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                        <Star size={16} /> {user.title}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid Dashboard */}
                        <div className="grid grid-cols-3 gap-3 md:gap-4 w-full md:w-auto flex-shrink-0">
                            {[
                                { label: 'Total XP', val: user.xp.toLocaleString(), color: 'text-white', glow: 'rgba(255,255,255,0.2)' },
                                { label: 'Hack Streak', val: `${user.streak} D`, color: 'text-amber-400', glow: 'rgba(245,158,11,0.3)' },
                                { label: 'Credits', val: user.credits.toLocaleString(), color: 'text-cyan-400', glow: 'rgba(34,211,238,0.3)' }
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -5, background: 'rgba(255,255,255,0.1)' }}
                                    className="flex flex-col items-center justify-center bg-black/40 p-4 md:p-6 rounded-[20px] border border-white/5 backdrop-blur-md transition-all relative overflow-hidden group/stat"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover/stat:opacity-100 transition-opacity"></div>
                                    <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-[0.2em] mb-2 relative z-10">{stat.label}</div>
                                    <div className={`text-2xl md:text-3xl font-black ${stat.color} relative z-10 tracking-tight`} style={{ textShadow: `0 0 20px ${stat.glow}` }}>
                                        {stat.val}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Next Unlock Widget (Integrated seamlessly) */}

                {nextLockedTool && (
                    <div className="bg-black/60 border-t border-white/5 p-4 flex items-center justify-between backdrop-blur-md cursor-pointer hover:bg-white/5 transition-colors group/unlock" onClick={() => handleTabSwitch(AppTab.LAB)}>
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-gray-800 rounded-lg border border-gray-700 group-hover/unlock:border-electric transition-colors">
                                <Lock size={18} className="text-gray-500 group-hover/unlock:text-electric" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('home.next_unlock')}</div>
                                <div className="text-sm font-bold text-white group-hover/unlock:text-electric transition-colors">{t(nextLockedTool.name)}</div>
                                <div className="text-[10px] text-gray-500 mt-0.5">{t(nextLockedTool.unlockCondition)}</div>
                            </div>
                        </div>
                        <div className="flex items-center text-xs text-electric font-bold uppercase bg-electric/10 px-3 py-1.5 rounded-full border border-electric/20 group-hover/unlock:bg-electric group-hover/unlock:text-white transition-all">
                            {t('home.view_lab')} <ChevronRight size={14} className="ml-1" />
                        </div>
                    </div>
                )}

                {/* ── SEARCH & FILTER BAR ── */}
                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search 58 simulations..."
                            className="w-full bg-black/60 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-electric/50 focus:shadow-[0_0_20px_rgba(196,95,255,0.15)] transition-all backdrop-blur-xl font-medium"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors text-xs font-bold bg-white/10 px-2 py-1 rounded-md">Clear</button>
                        )}
                    </div>

                    {/* Category Pills */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-2 px-2">
                        {CATEGORY_FILTERS.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setCategoryFilter(cat.key)}
                                className={`shrink-0 text-xs font-bold px-4 py-2 rounded-full border transition-all duration-200 ${categoryFilter === cat.key
                                    ? 'bg-electric/20 text-electric border-electric/50 shadow-[0_0_10px_rgba(196,95,255,0.2)]'
                                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Difficulty & Status Row */}
                    <div className="flex flex-wrap gap-2">
                        {(['ALL', 'Rookie', 'Pro', 'Elite'] as const).map(diff => (
                            <button
                                key={diff}
                                onClick={() => setDifficultyFilter(diff)}
                                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-200 ${difficultyFilter === diff
                                    ? diff === 'Rookie' ? 'bg-green-500/20 text-green-400 border-green-500/40'
                                        : diff === 'Pro' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                            : diff === 'Elite' ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                                : 'bg-white/10 text-white border-white/30'
                                    : 'bg-black/30 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/15'
                                    }`}
                            >
                                {diff === 'ALL' ? '⚡ All Levels' : diff}
                            </button>
                        ))}
                        <div className="w-px bg-white/10 mx-1"></div>
                        {(['ALL', 'COMPLETED', 'NEW'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-200 ${statusFilter === status
                                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                                    : 'bg-black/30 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/15'
                                    }`}
                            >
                                {status === 'ALL' ? 'All' : status === 'COMPLETED' ? '✅ Completed' : '✨ New'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── FEATURED CAROUSEL ── */}
                {!searchQuery && categoryFilter === 'ALL' && difficultyFilter === 'ALL' && statusFilter === 'ALL' && (
                    <div>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-xl font-black text-white uppercase italic tracking-wide">Featured Simulations</h3>
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full bg-electric animate-pulse"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-700"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-700"></div>
                            </div>
                        </div>
                        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                            {GAMES.slice(0, 10).map(game => {
                                const isCompleted = user.completedNodes?.includes(game.id);
                                return (
                                    <div key={game.id} onClick={() => handleGameLaunch(game)} className="snap-center shrink-0 w-[280px] md:w-[320px] relative aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/10 cursor-pointer group hover:border-electric transition-all shadow-xl hover:shadow-[0_0_30px_rgba(196,95,255,0.3)] hover:-translate-y-1">
                                        <GameCover game={game} className="opacity-70 group-hover:opacity-100 transition-opacity duration-500 scale-105 group-hover:scale-110" iconSize={48} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                                        {/* Completion Badge */}
                                        {isCompleted && (
                                            <div className="absolute top-2 left-2 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md border border-emerald-500/40 z-10 backdrop-blur-md flex items-center gap-1">
                                                <CheckCircle size={12} />
                                                <span className="text-[9px] font-bold uppercase">Cleared</span>
                                            </div>
                                        )}

                                        {game.isPremium && !user.isPro && (
                                            <div className="absolute top-2 right-2 bg-black/80 text-amber-500 p-1.5 rounded-full border border-amber-500/50 z-10 shadow-lg backdrop-blur-md">
                                                <Lock size={14} />
                                            </div>
                                        )}

                                        <div className="absolute bottom-4 left-4 right-4 z-10">
                                            <div className="text-lg font-black text-white truncate drop-shadow-md group-hover:text-electric transition-colors uppercase tracking-tight">
                                                {t(`game.${game.type.toLowerCase()}.title`)}
                                            </div>
                                            <div className="text-[11px] text-gray-300 truncate opacity-90 mb-3 drop-shadow-md">
                                                {t(`game.${game.type.toLowerCase()}.desc`)}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`text-[9px] px-2 py-0.5 rounded-sm font-bold uppercase border ${game.difficulty === 'Rookie' ? 'bg-green-900/40 border-green-500/50 text-green-400' :
                                                    game.difficulty === 'Pro' ? 'bg-blue-900/40 border-blue-500/50 text-blue-400' : 'bg-red-900/40 border-red-500/50 text-red-400'
                                                    }`}>
                                                    {t(`difficulty.${game.difficulty.toLowerCase()}`)}
                                                </span>
                                                <span className="text-[9px] text-gray-400 font-mono flex items-center bg-black/50 px-2 py-0.5 rounded-sm backdrop-blur-sm">
                                                    <Clock size={10} className="mr-1" /> {game.durationMin} {t('ui.min')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── FILTERED GAME GRID ── */}
                <div>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-xl font-black text-white uppercase italic tracking-wide">
                            {searchQuery || categoryFilter !== 'ALL' || difficultyFilter !== 'ALL' || statusFilter !== 'ALL' ? 'Results' : 'All Scenarios'}
                        </h3>
                        <span className="text-xs text-gray-500 font-mono">
                            {(() => {
                                const filtered = GAMES.filter(game => {
                                    if (searchQuery) {
                                        const q = searchQuery.toLowerCase();
                                        const title = t(`game.${game.type.toLowerCase()}.title`).toLowerCase();
                                        const desc = t(`game.${game.type.toLowerCase()}.desc`).toLowerCase();
                                        if (!title.includes(q) && !desc.includes(q) && !game.type.toLowerCase().includes(q)) return false;
                                    }
                                    if (categoryFilter !== 'ALL') {
                                        const skill = CATEGORY_FILTERS.find(c => c.key === categoryFilter)?.skill;
                                        if (skill && !game.tags.includes(skill)) return false;
                                    }
                                    if (difficultyFilter !== 'ALL' && game.difficulty !== difficultyFilter) return false;
                                    if (statusFilter === 'COMPLETED' && !user.completedNodes?.includes(game.id)) return false;
                                    if (statusFilter === 'NEW' && user.completedNodes?.includes(game.id)) return false;
                                    return true;
                                });
                                return `${filtered.length} / ${GAMES.length}`;
                            })()}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {GAMES.filter(game => {
                            if (searchQuery) {
                                const q = searchQuery.toLowerCase();
                                const title = t(`game.${game.type.toLowerCase()}.title`).toLowerCase();
                                const desc = t(`game.${game.type.toLowerCase()}.desc`).toLowerCase();
                                if (!title.includes(q) && !desc.includes(q) && !game.type.toLowerCase().includes(q)) return false;
                            }
                            if (categoryFilter !== 'ALL') {
                                const skill = CATEGORY_FILTERS.find(c => c.key === categoryFilter)?.skill;
                                if (skill && !game.tags.includes(skill)) return false;
                            }
                            if (difficultyFilter !== 'ALL' && game.difficulty !== difficultyFilter) return false;
                            if (statusFilter === 'COMPLETED' && !user.completedNodes?.includes(game.id)) return false;
                            if (statusFilter === 'NEW' && user.completedNodes?.includes(game.id)) return false;
                            return true;
                        }).slice(searchQuery || categoryFilter !== 'ALL' || difficultyFilter !== 'ALL' || statusFilter !== 'ALL' ? 0 : 10).map(game => {
                            const isCompleted = user.completedNodes?.includes(game.id);
                            return (
                                <div key={game.id} onClick={() => handleGameLaunch(game)} className={`relative aspect-video bg-gray-900 rounded-xl overflow-hidden border cursor-pointer group hover:border-white/30 transition-all hover:-translate-y-0.5 hover:shadow-xl ${isCompleted ? 'border-emerald-500/20' : 'border-white/5'}`}>
                                    <GameCover game={game} className="opacity-40 group-hover:opacity-80 transition-opacity duration-300" iconSize={32} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>

                                    {/* Completion indicator */}
                                    {isCompleted && (
                                        <div className="absolute top-1.5 left-1.5 z-10">
                                            <CheckCircle size={14} className="text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.6)]" />
                                        </div>
                                    )}

                                    {game.isPremium && !user.isPro && (
                                        <div className="absolute top-2 right-2 text-amber-500/50 z-10"><Lock size={12} /></div>
                                    )}
                                    <div className="absolute bottom-2 left-2 right-2 z-10">
                                        <div className="text-xs font-bold text-white truncate group-hover:text-electric transition-colors">{t(`game.${game.type.toLowerCase()}.title`)}</div>
                                        <div className="text-[9px] text-gray-500 truncate">{t(`game.${game.type.toLowerCase()}.desc`)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Empty state */}
                    {GAMES.filter(game => {
                        if (searchQuery) {
                            const q = searchQuery.toLowerCase();
                            const title = t(`game.${game.type.toLowerCase()}.title`).toLowerCase();
                            const desc = t(`game.${game.type.toLowerCase()}.desc`).toLowerCase();
                            if (!title.includes(q) && !desc.includes(q) && !game.type.toLowerCase().includes(q)) return false;
                        }
                        if (categoryFilter !== 'ALL') {
                            const skill = CATEGORY_FILTERS.find(c => c.key === categoryFilter)?.skill;
                            if (skill && !game.tags.includes(skill)) return false;
                        }
                        if (difficultyFilter !== 'ALL' && game.difficulty !== difficultyFilter) return false;
                        if (statusFilter === 'COMPLETED' && !user.completedNodes?.includes(game.id)) return false;
                        if (statusFilter === 'NEW' && user.completedNodes?.includes(game.id)) return false;
                        return true;
                    }).length === 0 && (
                            <div className="text-center py-20 text-gray-500">
                                <Search size={48} className="mx-auto mb-4 opacity-30" />
                                <p className="text-sm font-bold">No simulations match your filters.</p>
                                <button onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setDifficultyFilter('ALL'); setStatusFilter('ALL'); }} className="text-electric text-xs mt-3 underline">Clear all filters</button>
                            </div>
                        )}
                </div>

                {/* Continue Learning Path Link */}
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 group cursor-pointer hover:border-electric transition-all" onClick={() => handleTabSwitch(AppTab.LEARN)}>
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-electric/20 rounded-full border border-electric/50 text-electric group-hover:scale-110 transition-transform">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase italic">{t('home.continue_path')}</h3>
                            <p className="text-sm text-gray-400">{t('home.path_desc')}</p>
                        </div>
                    </div>
                    <Button variant="primary" className="shadow-[0_0_20px_rgba(196,95,255,0.3)]">
                        {t('ui.enter_path')} <ChevronRight className="ml-2" size={16} />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};
