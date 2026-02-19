
import React, { useState, useEffect } from 'react';
import { Squad, SquadMember, UserStats } from '../types';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { Users, Plus, Search, Crown, Shield, Globe, Link as LinkIcon, Check, Lock, Swords, Trophy, AlertTriangle, CheckCircle2, Zap, Share2, LogOut, ShieldAlert, Skull, Target } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { audio } from '../services/audioService';
import { squadsService } from '../services/squadsService';

interface SquadManagerProps {
    squads: Squad[];
    userSquadId?: string;
    onJoinSquad: (squadId: string) => void;
    onCreateSquad: (name: string, avatar: string) => void;
    isPro: boolean;
    onTriggerPaywall: () => void;
    t: (key: string) => string;
    user: UserStats;
    onUpdateUser: (user: UserStats) => void;
    onUpdateSquads?: (squads: Squad[]) => void;
}

const SQUAD_ICONS = ['🦁', '🐉', '🤖', '👽', '👾', '🚀', '⚔️', '🧬', '👁️', '🔥'];

export const SquadManager: React.FC<SquadManagerProps> = ({ squads, userSquadId, onJoinSquad, onCreateSquad, isPro, onTriggerPaywall, t, user, onUpdateUser, onUpdateSquads }) => {
    const [view, setView] = useState<'MY_SQUAD' | 'BROWSE' | 'CREATE' | 'WAR_ROOM' | 'REPORT'>('MY_SQUAD');
    const [newSquadName, setNewSquadName] = useState('');
    const [newSquadIcon, setNewSquadIcon] = useState(SQUAD_ICONS[0]);
    const [copied, setCopied] = useState(false);
    const { showToast } = useToast();

    // War Room State (Mock Backend Data)
    const [bossHp, setBossHp] = useState(1000000); // 1 Million HP for shared boss
    const [maxBossHp, setMaxBossHp] = useState(1000000);
    const [isDeploying, setIsDeploying] = useState(false);
    const [missionResult, setMissionResult] = useState<{ xp: number, credits: number, damage: number } | null>(null);
    const [cooldown, setCooldown] = useState(0); // Ms until next attack
    const [screenShake, setScreenShake] = useState(false);

    const userSquad = squads.find(s => s.id === userSquadId);

    // Simulate fetching boss state from "Backend"
    useEffect(() => {
        if (view === 'WAR_ROOM' && userSquadId) {
            // Check local storage for simulated shared state
            const storedBoss = localStorage.getItem(`raid_boss_${userSquadId}`);
            if (storedBoss) {
                const data = JSON.parse(storedBoss);
                setBossHp(data.hp);
                setMaxBossHp(data.maxHp);
            } else {
                // Initialize new boss
                const newBoss = { hp: 1000000, maxHp: 1000000, id: Date.now() };
                localStorage.setItem(`raid_boss_${userSquadId}`, JSON.stringify(newBoss));
                setBossHp(1000000);
            }

            // Check cooldown
            const lastAttack = localStorage.getItem(`last_attack_${user.id}`);
            if (lastAttack) {
                const diff = Date.now() - parseInt(lastAttack);
                // Allow attack every 5 minutes for demo purposes (real app would be 24h)
                const COOLDOWN_TIME = 5 * 60 * 1000;
                if (diff < COOLDOWN_TIME) {
                    setCooldown(COOLDOWN_TIME - diff);
                }
            }
        }
    }, [view, userSquadId, user.id]);

    // Cooldown timer
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => {
                setCooldown(c => Math.max(0, c - 1000));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cooldown]);

    const handleInvite = () => {
        const inviteLink = `https://yokaizen.ai/join?squad=${userSquadId}`;
        if (navigator.share) {
            navigator.share({
                title: t('squad.share_title'),
                text: t('squad.share_text').replace('{name}', userSquad?.name || ''),
                url: inviteLink,
            }).catch(() => {
                navigator.clipboard.writeText(inviteLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } else {
            navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        audio.playClick();
    };

    const handleCreateClick = () => {
        if (!isPro) {
            onTriggerPaywall();
            return;
        }
        setView('CREATE');
        audio.playClick();
    };

    const handleLeaveSquad = () => {
        if (confirm(t('squad.leave_confirm'))) {
            onUpdateUser({ ...user, squadId: undefined });
            if (onUpdateSquads && userSquad) {
                const updatedSquad = {
                    ...userSquad,
                    members: userSquad.members.filter(m => m.id !== user.id)
                };
                const newSquads = squads.map(s => s.id === userSquad.id ? updatedSquad : s);
                onUpdateSquads(newSquads);
            }
            setView('BROWSE');
            audio.playClick();
        }
    };

    const handleEnterWarRoom = () => {
        setView('WAR_ROOM');
        audio.playScan();
    };

    const handleContribute = () => {
        if (user.credits >= 50) {
            onUpdateUser({ ...user, credits: user.credits - 50, xp: user.xp + 100 });
            if (onUpdateSquads && userSquad) {
                const updatedSquad = {
                    ...userSquad,
                    totalXp: userSquad.totalXp + 100,
                    weeklyQuestProgress: Math.min(userSquad.weeklyQuestTarget, userSquad.weeklyQuestProgress + 50)
                };
                onUpdateSquads(squads.map(s => s.id === userSquad.id ? updatedSquad : s));
            }
            audio.playSuccess();
        } else {
            showToast(t('squad.insufficient_credits'), 'error');
            audio.playError();
        }
    };

    const handleAttackBoss = async () => {
        if (cooldown > 0) return;
        if (!userSquadId) return;

        setIsDeploying(true);
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 500);
        audio.playEngine(2000);

        // Call Backend
        try {
            // Artificial Delay for animation
            await new Promise(r => setTimeout(r, 1500));

            const result = await squadsService.attackBoss(userSquadId);

            setIsDeploying(false);

            if (result) {
                setBossHp(result.boss.hp);
                setMaxBossHp(result.boss.maxHp);
                setMissionResult({
                    xp: result.rewards.xp,
                    credits: result.rewards.credits,
                    damage: result.damage
                });

                // Optimistic update of local user
                onUpdateUser({
                    ...user,
                    xp: user.xp + result.rewards.xp,
                    credits: user.credits + result.rewards.credits
                });

                audio.playSuccess();
                setView('REPORT');
            } else {
                showToast(t('squad.attack_failed'), "error");
            }
        } catch (e) {
            console.error(e);
            setIsDeploying(false);
        }
    };

    const formatCooldown = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!userSquadId && view === 'MY_SQUAD') {
        return (
            <div className="p-6 text-center space-y-6 animate-in fade-in h-full flex flex-col justify-center">
                <div className="w-24 h-24 bg-gray-800 rounded-full mx-auto flex items-center justify-center border border-gray-700 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                    <Users size={40} className="text-gray-400" />
                </div>
                <div>
                    <h3 className="text-2xl font-black text-white uppercase italic">{t('squad.no_assigned')}</h3>
                    <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">{t('squad.join_desc')}</p>
                </div>
                <div className="space-y-3 w-full max-w-xs mx-auto">
                    <Button fullWidth variant="primary" onClick={() => setView('BROWSE')}>{t('squad.browse')}</Button>
                    <Button fullWidth variant="secondary" onClick={handleCreateClick}>
                        {isPro ? t('squad.create') : <span className="flex items-center justify-center"><Lock size={14} className="mr-2" /> {t('squad.create_pro')}</span>}
                    </Button>
                </div>
            </div>
        );
    }

    if (view === 'CREATE') {
        return (
            <div className="p-6 space-y-6 animate-in slide-in-from-right bg-black/80 h-full overflow-y-auto">
                <h3 className="text-lg font-bold text-white flex items-center"><Plus className="mr-2" size={20} /> {t('squad.establish')}</h3>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">{t('squad.icon_label')}</label>
                    <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide">
                        {SQUAD_ICONS.map(icon => (
                            <button
                                key={icon}
                                onClick={() => { setNewSquadIcon(icon); audio.playClick(); }}
                                className={`w-14 h-14 flex-shrink-0 rounded-xl flex items-center justify-center text-3xl border transition-all ${newSquadIcon === icon ? 'bg-electric/20 border-electric shadow-[0_0_15px_rgba(196,95,255,0.4)] scale-110' : 'bg-gray-900 border-gray-700 opacity-50'}`}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">{t('squad.name_label')}</label>
                    <input
                        type="text"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 text-white focus:border-electric focus:outline-none text-lg font-bold"
                        placeholder="e.g. Cyber Ronin"
                        value={newSquadName}
                        onChange={(e) => setNewSquadName(e.target.value)}
                    />
                </div>
                <div className="flex space-x-3 pt-4">
                    <Button className="flex-1" variant="ghost" onClick={() => setView(userSquadId ? 'MY_SQUAD' : 'MY_SQUAD')}>{t('squad.cancel')}</Button>
                    <Button
                        className="flex-[2]"
                        variant="primary"
                        disabled={!newSquadName}
                        onClick={() => { onCreateSquad(newSquadName, newSquadIcon); setView('MY_SQUAD'); }}
                    >
                        {t('squad.confirm_create')}
                    </Button>
                </div>
            </div>
        );
    }

    if (view === 'BROWSE') {
        return (
            <div className="p-4 space-y-4 animate-in slide-in-from-right h-full overflow-y-auto">
                <div className="flex items-center justify-between mb-4 bg-black/60 p-3 rounded-xl border border-white/10 sticky top-0 backdrop-blur z-10">
                    <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => setView('MY_SQUAD')}>←</Button>
                        <h3 className="text-lg font-bold text-white">{t('squad.recruit')}</h3>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-2 text-gray-500" size={14} />
                        <input type="text" placeholder={t('squad.search')} className="pl-8 pr-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:border-electric focus:outline-none w-32" />
                    </div>
                </div>

                <div className="space-y-3 pb-20">
                    {squads.filter(s => s.id !== userSquadId).map(squad => (
                        <GlassCard key={squad.id} className="flex justify-between items-center group hover:bg-white/5 border-white/5">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white/5">
                                    {squad.avatar || '🛡️'}
                                </div>
                                <div>
                                    <h4 className="font-black text-white text-sm uppercase tracking-wide">{squad.name}</h4>
                                    <div className="flex space-x-2 mt-1.5">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${squad.tier === 'Elite' ? 'border-amber-500 text-amber-500 bg-amber-500/10' :
                                            squad.tier === 'Challenger' ? 'border-cyan text-cyan bg-cyan/10' :
                                                'border-gray-500 text-gray-500 bg-gray-500/10'
                                            }`}>
                                            {squad.tier}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-mono flex items-center">
                                            <Users size={10} className="mr-1" /> {squad.members.length}/10
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => { onJoinSquad(squad.id); setView('MY_SQUAD'); audio.playSuccess(); }}>{t('squad.join')}</Button>
                        </GlassCard>
                    ))}
                </div>
            </div>
        );
    }

    if (view === 'WAR_ROOM') {
        return (
            <div className={`p-4 h-full flex flex-col bg-black/90 animate-in zoom-in relative overflow-hidden transition-transform duration-100 ${screenShake ? 'translate-x-1 translate-y-1' : ''}`}>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
                {/* Red Flash on Attack */}
                <div className={`absolute inset-0 bg-red-500/20 pointer-events-none transition-opacity duration-100 ${screenShake ? 'opacity-100' : 'opacity-0'} z-50`}></div>

                <div className="text-center mb-6 border-b border-red-900/30 pb-4 relative z-10 flex justify-between items-center">
                    <Button variant="ghost" size="sm" onClick={() => setView('MY_SQUAD')}>←</Button>
                    <div>
                        <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest animate-pulse glitch-text">{t('squad.war_room')}</h2>
                        <p className="text-[10px] text-red-400/70 font-mono mt-1">{t('squad.raid_target')}</p>
                    </div>
                    {/* Timer or Status */}
                    <div className="w-8 flex justify-center">
                        <div className={`w-3 h-3 rounded-full ${cooldown > 0 ? 'bg-red-900' : 'bg-green-500 animate-ping'}`}></div>
                    </div>
                </div>

                {/* BOSS ARENA */}
                <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                    <div className="w-full max-w-sm mb-8">
                        <div className="flex justify-between text-xs font-bold text-red-400 mb-1">
                            <span>{t('squad.boss_hp')}</span>
                            <span>{bossHp.toLocaleString()} / {maxBossHp.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-6 bg-gray-900 rounded-full overflow-hidden border-2 border-red-900/50 relative">
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.2)_10px,rgba(0,0,0,0.2)_20px)] z-10"></div>
                            <div className="h-full bg-red-600 transition-all duration-1000" style={{ width: `${(bossHp / maxBossHp) * 100}%` }}></div>
                        </div>
                    </div>

                    <div className={`relative w-64 h-64 flex items-center justify-center ${isDeploying ? 'scale-110' : ''} transition-transform duration-1000`}>
                        <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse blur-xl"></div>
                        <div className="absolute inset-0 border-2 border-dashed border-red-500/30 rounded-full animate-spin-slow"></div>
                        <Skull size={128} className="text-red-500 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)] z-10" />

                        {/* Attack Visuals */}
                        {isDeploying && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Target size={200} className="text-cyan-400 animate-ping absolute opacity-50" />
                                <div className="absolute w-full h-1 bg-cyan-400 rotate-45"></div>
                                <div className="absolute w-full h-1 bg-cyan-400 -rotate-45"></div>
                            </div>
                        )}
                    </div>

                    {bossHp <= 0 && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 animate-in zoom-in">
                            <div className="text-center">
                                <h2 className="text-4xl text-green-500 font-black glitch-text mb-2">{t('squad.target_destroyed')}</h2>
                                <p className="text-green-400 font-mono">{t('squad.reward_xp').replace('{amount}', '5000')}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 space-y-3 relative z-10">
                    <Button
                        fullWidth
                        variant="danger"
                        onClick={handleAttackBoss}
                        disabled={isDeploying || bossHp <= 0 || cooldown > 0}
                        className={`h-16 text-xl font-black tracking-widest shadow-[0_0_30px_rgba(220,38,38,0.4)] border-2 border-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${!isDeploying && cooldown === 0 ? 'hover:scale-[1.02] hover:bg-red-600' : ''}`}
                    >
                        {cooldown > 0 ? `${t('squad.recharging')} (${formatCooldown(cooldown)})` : isDeploying ? t('squad.attacking') : t('squad.launch_raid')}
                    </Button>
                    <p className="text-center text-[10px] text-gray-500 font-mono">{t('squad.raid_desc')}</p>
                </div>
            </div>
        );
    }

    if (view === 'REPORT' && missionResult) {
        return (
            <div className="p-6 h-full flex flex-col items-center justify-center bg-black animate-in zoom-in text-center">
                <Trophy size={80} className="text-yellow-400 mb-6 animate-bounce drop-shadow-[0_0_25px_rgba(250,204,21,0.5)]" />
                <h2 className="text-4xl font-black text-white mb-2 uppercase italic">{t('squad.mission_success')}</h2>

                <div className="w-full max-w-xs bg-gray-900 border border-white/10 rounded-xl p-6 mt-8 space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span className="text-xs text-gray-400 font-bold uppercase">{t('squad.damage_dealt')}</span>
                        <span className="text-xl font-mono font-black text-red-500">-{missionResult.damage}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span className="text-xs text-gray-400 font-bold uppercase">{t('squad.xp_gain')}</span>
                        <span className="text-xl font-mono font-black text-electric">+{missionResult.xp}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400 font-bold uppercase">{t('squad.credits_gain')}</span>
                        <span className="text-xl font-mono font-black text-cyan-400">+{missionResult.credits}</span>
                    </div>
                </div>
                <Button size="lg" variant="primary" onClick={() => setView('WAR_ROOM')} className="mt-12 w-full max-w-xs">
                    {t('ui.close')}
                </Button>
            </div>
        )
    }

    // My Squad View
    return (
        <div className="p-4 space-y-6 animate-in fade-in h-full overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 border border-white/10 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto bg-electric/10 rounded-2xl flex items-center justify-center mb-4 border border-electric/50 shadow-[0_0_30px_rgba(196,95,255,0.2)]">
                        <span className="text-4xl">{userSquad?.avatar || '🛡️'}</span>
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">{userSquad?.name}</h2>
                    <div className="flex justify-center space-x-2 mt-3 mb-6">
                        <span className="bg-amber-500/10 text-amber-500 text-[10px] px-3 py-1 rounded-full border border-amber-500/30 font-bold uppercase tracking-wide">{userSquad?.tier} Tier</span>
                        <span className="bg-cyan/10 text-cyan text-[10px] px-3 py-1 rounded-full border border-cyan/30 font-bold font-mono">{userSquad?.totalXp.toLocaleString()} XP</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button size="sm" variant="secondary" onClick={handleInvite} className="flex items-center justify-center text-xs border-dashed">
                            {copied ? <Check size={14} className="mr-1" /> : <Share2 size={14} className="mr-1" />}
                            {copied ? t('squad.copied') : t('squad.invite')}
                        </Button>
                        <Button size="sm" variant="primary" onClick={handleEnterWarRoom} className="flex items-center justify-center text-xs bg-red-600 hover:bg-red-500 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                            <Swords size={14} className="mr-1" /> {t('squad.war_room')}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900/30 border border-white/5 rounded-xl p-4">
                <div className="flex justify-between items-end mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center"><Zap size={14} className="mr-2 text-electric" /> {t('squad.contribution')}</h3>
                    <button onClick={handleContribute} className="text-[10px] text-electric font-bold bg-electric/10 px-2 py-1 rounded hover:bg-electric/20 transition-colors">
                        {t('squad.contribute')}
                    </button>
                </div>
                <div className="flex justify-between items-end mb-1 text-[10px] text-gray-500 font-mono">
                    <span>{t('squad.weekly_goal')}</span>
                    <span>{userSquad?.weeklyQuestProgress}/{userSquad?.weeklyQuestTarget}</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-electric to-purple-400 transition-all duration-1000"
                        style={{ width: `${Math.min(100, (userSquad!.weeklyQuestProgress / userSquad!.weeklyQuestTarget) * 100)}%` }}
                    />
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">{t('squad.operatives')}</h3>
                    <div className="flex space-x-2">
                        <button className="text-gray-500 hover:text-white" onClick={handleLeaveSquad} title={t('squad.leave')}>
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
                <div className="space-y-2.5">
                    {userSquad?.members.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center space-x-3">
                                <img src={m.avatar} className="w-8 h-8 rounded-lg bg-black object-cover" />
                                <span className="text-sm font-bold text-gray-200">{m.name}</span>
                            </div>
                            {m.role === 'leader' && <Crown size={16} className="text-amber-400 fill-amber-400/20" />}
                        </div>
                    ))}
                    {Array.from({ length: Math.max(0, 10 - (userSquad?.members.length || 0)) }).map((_, i) => (
                        <div key={i} className="p-3 rounded-xl border border-dashed border-gray-800 flex items-center justify-center text-[10px] text-gray-700 uppercase font-mono tracking-widest">
                            {t('squad.empty_slot')}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
