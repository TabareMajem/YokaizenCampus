import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Share2, Activity, Box, Play, Award, Lock, Shield, Key } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { GameAnalyticsDashboard } from '../components/GameAnalyticsDashboard';
import { SkillRadar } from '../components/SkillRadar';

interface ProfilePageProps {
    user: any;
    t: (k: string, r?: any) => string;
    idCardRef: React.RefObject<HTMLDivElement>;
    isGeneratingCard: boolean;
    handleExportIDCard: () => void;
    setShowSkillTree: (v: boolean) => void;
    setActiveGeneratedGame: (g: any) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
    user, t, idCardRef, isGeneratingCard, handleExportIDCard, setShowSkillTree, setActiveGeneratedGame
}) => {
    return (
        <motion.div key="profile" initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -20 }} transition={{ duration: 0.4 }} className="p-4 sm:p-8 space-y-10 pb-32">
            {/* Epic Profile Header Card (Operative Dossier) */}
            <div ref={idCardRef} className="bg-gradient-to-br from-gray-900/90 via-black/80 to-electric/20 p-8 sm:p-10 rounded-[2rem] border border-white/10 backdrop-blur-2xl relative overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {/* Cyberpunk Texture Overlays */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none opacity-50"></div>

                {/* Animated light sweeps */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-electric/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700"></div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-8 relative z-10">
                    <div className="relative group/avatar">
                        <div className="w-32 h-32 rounded-[2rem] border-2 border-white/20 p-1 shadow-[0_0_30px_rgba(196,95,255,0.3)] bg-black overflow-hidden group-hover/avatar:border-electric transition-colors duration-500">
                            <img src={user.avatar} className="w-full h-full object-cover rounded-[1.8rem] group-hover/avatar:scale-110 transition-transform duration-700" />
                        </div>
                        <div className="absolute inset-0 bg-electric/50 rounded-[2rem] blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500 -z-10"></div>
                    </div>
                    <div className="text-center sm:text-left flex-1">
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg mb-2">{user.name}</h2>
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-electric/10 border border-electric/30 text-electric font-bold text-sm uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(196,95,255,0.2)]">
                            <div className="w-2 h-2 rounded-full bg-electric animate-pulse mr-2 shadow-[0_0_10px_#c45fff]"></div>
                            {user.title}
                        </div>

                        <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                            <div className="bg-black/60 border border-white/10 px-5 py-3 rounded-2xl flex items-center backdrop-blur-xl shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] group/stat hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all">
                                <Shield size={18} className="text-amber-400 mr-3 group-hover/stat:scale-125 transition-transform" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] leading-none mb-1">Clearance Level</span>
                                    <span className="text-xl font-black text-white leading-none tracking-wider font-mono">{user.level}</span>
                                </div>
                            </div>
                            <div className="bg-black/60 border border-white/10 px-5 py-3 rounded-2xl flex items-center backdrop-blur-xl shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] group/stat hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all">
                                <Key size={18} className="text-cyan-400 mr-3 group-hover/stat:scale-125 transition-transform" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] leading-none mb-1">Encryption Keys</span>
                                    <span className="text-xl font-black text-white leading-none flex items-baseline font-mono tracking-wider">
                                        {user.credits} <span className="text-xs text-cyan-700 ml-1 font-sans">CR</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleExportIDCard}
                            disabled={isGeneratingCard}
                            className="mt-6 flex items-center justify-center bg-transparent border border-electric/50 text-electric hover:bg-electric/20 rounded-xl px-5 py-2.5 text-xs font-bold transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(196,95,255,0.2)] hover:shadow-[0_0_25px_rgba(196,95,255,0.5)]"
                            title="Export Neural ID to PNG"
                        >
                            <Share2 size={16} className="mr-3" />
                            {isGeneratingCard ? 'Exporting...' : 'Export Neural ID Card'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Epic Game Analytics */}
                <div className="lg:col-span-2">
                    <GameAnalyticsDashboard user={user} t={t} />
                </div>

                {/* Epic Skills Radar */}
                <div className="bg-gradient-to-br from-black/80 to-gray-900/90 p-8 rounded-[2rem] border border-white/10 relative group hover:border-white/20 transition-all shadow-2xl backdrop-blur-xl flex flex-col items-center overflow-hidden">
                    {/* Background Texture */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none opacity-50 z-0"></div>

                    <div className="w-full flex justify-between items-center mb-8 relative z-10">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                            <Activity size={18} className="mr-3 text-electric" /> SKILL MATRIX
                        </h3>
                        <button
                            className="bg-electric/10 text-electric text-xs font-bold px-4 py-2 rounded-xl border border-electric/30 hover:bg-electric border-hover bg-hover text-hover transition-all shadow-[0_0_15px_rgba(196,95,255,0.2)] hover:shadow-[0_0_25px_rgba(196,95,255,0.6)] hover:text-white"
                            onClick={() => setShowSkillTree(true)}
                        >
                            {t('ui.view_skill_tree')}
                        </button>
                    </div>
                    <div className="relative z-10 w-full flex-1 flex items-center justify-center min-h-[300px]">
                        <SkillRadar skills={user.skills} t={t} />
                    </div>
                </div>

                {/* Epic Created Games */}
                <div className="bg-gradient-to-br from-black/80 to-gray-900/90 p-8 rounded-[2rem] border border-white/10 group hover:border-white/20 transition-all shadow-2xl backdrop-blur-xl flex flex-col relative overflow-hidden">
                    {/* Background Texture */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none z-0"></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] pointer-events-none z-0"></div>

                    <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-8 flex items-center relative z-10">
                        <Box size={18} className="mr-3 text-cyan-400" /> ASSEMBLED CONSTRUCTS
                    </h3>
                    <div className="space-y-4 flex-1 mt-2 overflow-y-auto pr-2 custom-scrollbar max-h-[300px] relative z-10">
                        {(user.createdGames || []).map((g: any, i: number) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-cyan-500/50 hover:bg-gradient-to-r hover:from-cyan-900/20 hover:to-transparent transition-all group/item shadow-sm hover:shadow-lg">
                                <span className="text-base font-bold text-gray-300 group-hover/item:text-white transition-colors">{g.title}</span>
                                <Button size="sm" variant="primary" onClick={() => setActiveGeneratedGame(g)} className="opacity-0 group-hover/item:opacity-100 transition-all translate-x-4 group-hover/item:translate-x-0"><Play size={14} className="mr-2" /> {t('ui.play')}</Button>
                            </div>
                        ))}
                        {(!user.createdGames || user.createdGames.length === 0) && (
                            <div className="h-full w-full flex flex-col items-center justify-center text-gray-600 space-y-4 opacity-70">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                    <Box size={24} className="text-gray-500" />
                                </div>
                                <span className="text-xs uppercase font-bold tracking-[0.2em]">{t('profile.no_games')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Epic Badges Gallery */}
            <div className="bg-gradient-to-br from-black/80 to-gray-900/90 p-8 rounded-[2rem] border border-white/10 relative group hover:border-white/20 transition-all shadow-2xl backdrop-blur-xl overflow-hidden mt-8">
                {/* Background Textures */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none opacity-30 z-0"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

                <div className="flex items-center justify-between mb-8 relative z-10 border-b border-white/5 pb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                        <Award size={18} className="mr-3 text-amber-500" /> HALL OF MASTERY
                    </h3>
                    <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                        {user.inventory.filter(i => i.type === 'BADGE').length} / 16 Artifacts Secured
                    </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-4 sm:gap-6 relative z-10">
                    {user.inventory.filter(i => i.type === 'BADGE').map(b => (
                        <div key={b.id} className="aspect-square bg-gradient-to-b from-gray-800 to-black rounded-2xl flex flex-col items-center justify-center border border-white/10 relative group/badge hover:-translate-y-2 shadow-lg hover:shadow-[0_20px_40px_rgba(245,158,11,0.2)] transition-all duration-500 cursor-crosshair overflow-hidden hover:border-amber-500/60">
                            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent opacity-0 group-hover/badge:opacity-100 transition-opacity duration-300"></div>

                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-1 group-hover/badge:scale-110 transition-transform duration-500">
                                {b.icon.endsWith('.svg') || b.icon.endsWith('.png') ? (
                                    <img src={`/assets/badges/${b.icon}`} alt={b.name} className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" onError={(e) => (e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${b.name}`)} />
                                ) : (
                                    <span className="text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{b.icon}</span>
                                )}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-amber-500/30 flex items-center justify-center text-[10px] font-black tracking-wider text-center py-2 px-1 translate-y-full group-hover/badge:translate-y-0 transition-transform duration-300 rounded-b-2xl z-20 text-amber-400 uppercase shadow-[0_-10px_20px_rgba(0,0,0,0.8)]">
                                {b.name}
                            </div>
                        </div>
                    ))}

                    {/* Epic Locked placeholders */}
                    {Array.from({ length: Math.max(0, 16 - user.inventory.filter(i => i.type === 'BADGE').length) }).map((_, i) => (
                        <div key={`locked-${i}`} className="aspect-square bg-black/40 rounded-2xl border border-white/5 border-dashed flex flex-col items-center justify-center opacity-40 hover:opacity-80 hover:bg-black/60 hover:border-white/20 transition-all duration-300 group/locked">
                            <Lock size={20} className="text-gray-600 mb-2 group-hover/locked:text-gray-400 transition-colors" />
                            <div className="w-8 h-1 bg-gray-800 rounded-full"></div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};
