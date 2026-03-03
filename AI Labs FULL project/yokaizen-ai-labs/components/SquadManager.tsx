
import React, { useState, useEffect, useRef } from 'react';
import { Squad, SquadMember, UserStats } from '../types';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { Users, Plus, Search, Crown, Shield, Globe, Link as LinkIcon, Check, Lock, Swords, Trophy, AlertTriangle, CheckCircle2, Share2, LogOut, ShieldAlert, Skull, Target, Ghost, Sword, Flame, Droplet, Wind, Mountain, Sun, Moon, Zap } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { audio } from '../services/audioService';
import { squadsService } from '../services/squadsService';
import { useFocusMode } from '../hooks/useFocusMode';
import { FPSGrader } from './ui/FPSGrader';

// --- 3D Imports ---
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

interface SquadManagerProps {
    squads: Squad[];
    userSquadId?: string;
    onJoinSquad: (squadId: string) => void;
    onCreateSquad: (name: string, avatar: string) => void;
    isPro: boolean;
    onTriggerPaywall: () => void;
    t: (key: string) => string;
    onUpdateUser: (user: UserStats) => void;
    onUpdateSquads?: (squads: Squad[]) => void;
}
const SQUAD_ICONS = [Ghost, Shield, Sword, Zap, Flame, Droplet, Wind, Mountain, Sun, Moon];

// --- 3D Components ---
const TacticalGlobe = ({ isAttacking, hpRatio }: { isAttacking: boolean; hpRatio: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * (isAttacking ? 2 : 0.2);
            if (isAttacking) {
                meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 30) * 0.08);
            } else {
                meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            }
        }
    });

    const isCritical = hpRatio < 0.3;
    const color = isAttacking ? "#ef4444" : isCritical ? "#f59e0b" : "#0891b2";
    const emissive = isAttacking ? "#dc2626" : isCritical ? "#d97706" : "#0284c7";

    return (
        <Float speed={2} rotationIntensity={isAttacking ? 5 : 1} floatIntensity={isAttacking ? 2 : 0.5}>
            <Sphere ref={meshRef} args={[2.5, 64, 64]}>
                <MeshDistortMaterial
                    color={color}
                    emissive={emissive}
                    emissiveIntensity={isAttacking ? 4 : isCritical ? 2 : 1}
                    wireframe={!isAttacking && !isCritical}
                    distort={isAttacking ? 0.6 : isCritical ? 0.3 : 0.1}
                    speed={isAttacking ? 10 : isCritical ? 5 : 2}
                    roughness={0.1}
                    metalness={0.9}
                    clearcoat={1}
                />
            </Sphere>
            <Sparkles count={isAttacking ? 300 : 50} scale={8} size={isAttacking ? 6 : 2} speed={isAttacking ? 2 : 0.2} color={color} />
        </Float>
    );
};

export const SquadManager: React.FC<SquadManagerProps> = ({ squads, userSquadId, onJoinSquad, onCreateSquad, isPro, onTriggerPaywall, t, user, onUpdateUser, onUpdateSquads }) => {
    const { focusMode } = useFocusMode();
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
            <div className="p-6 text-center space-y-6 animate-in fade-in h-full flex flex-col justify-center bg-black/40 backdrop-blur-sm rounded-2xl border border-white/5 m-4">
                <div className="w-24 h-24 bg-gray-900/80 rounded-full mx-auto flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(196,95,255,0.2)]">
                    <Users size={40} className="text-electric animate-pulse" />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-white uppercase italic drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{t('squad.no_assigned')}</h3>
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
            <div className="p-6 space-y-6 animate-in slide-in-from-right bg-black/60 backdrop-blur-md h-full overflow-y-auto rounded-2xl border border-white/10 m-4">
                <h3 className="text-2xl font-black text-white flex items-center uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"><Plus className="mr-3 text-electric" size={28} /> {t('squad.establish')}</h3>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">{t('squad.icon_label')}</label>
                    <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide">
                        {SQUAD_ICONS.map((Icon, i) => (
                            <button
                                key={i}
                                onClick={() => { setNewSquadIcon(i.toString()); audio.playClick(); }}
                                className={`w-14 h-14 flex-shrink-0 rounded-xl flex items-center justify-center text-white border transition-all ${newSquadIcon === i.toString() ? 'bg-electric/20 border-electric shadow-[0_0_15px_rgba(196,95,255,0.4)] scale-110' : 'bg-gray-900 border-gray-700 opacity-50'}`}
                            >
                                <Icon size={24} />
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
                <div className="flex items-center justify-between mb-6 bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 sticky top-0 z-10 shadow-lg">
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
                                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.1)] border border-white/10">
                                    {isNaN(Number(squad.avatar)) ? <Shield size={20} /> : React.createElement(SQUAD_ICONS[Number(squad.avatar)] || Shield, { size: 20 })}
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
            <div className={`p-6 h-full flex flex-col bg-black/80 backdrop-blur-md animate-in zoom-in relative overflow-hidden transition-transform duration-100 ${screenShake ? 'translate-x-1 translate-y-1' : ''}`}>
                {/* Cyberpunk Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0 mix-blend-screen"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay z-0"></div>

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

                {/* BOSS ARENA (3D) */}
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
                    {/* Absolute 3D Canvas Background */}
                    <div className="absolute inset-x-0 top-10 bottom-0 z-0 pointer-events-none">
                        <Canvas camera={{ position: [0, 0, 8], fov: 60 }} dpr={[1, 2]}>
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} intensity={1} color={isDeploying ? "#ef4444" : "#0891b2"} />
                            <TacticalGlobe isAttacking={isDeploying} hpRatio={bossHp / maxBossHp} />
                            <Stars radius={50} depth={50} count={isDeploying ? 2000 : 1000} factor={4} saturation={1} fade speed={isDeploying ? 3 : 1} />
                            <FPSGrader />
                            {!focusMode && (
                                <EffectComposer>
                                    <Bloom luminanceThreshold={0.2} mipmapBlur intensity={isDeploying ? 3 : 1.5} />
                                    <ChromaticAberration offset={new THREE.Vector2(isDeploying ? 0.005 : 0.002, isDeploying ? 0.005 : 0)} radialModulation={false} modulationOffset={0} />
                                    <Noise opacity={0.1} />
                                </EffectComposer>
                            )}
                        </Canvas>
                    </div>

                    <div className="w-full max-w-sm mb-auto mt-4 relative z-10 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-red-900/30">
                        <div className="flex justify-between text-xs font-bold text-red-400 mb-2 uppercase tracking-widest">
                            <span className="flex items-center"><Target size={14} className="mr-2" /> {t('squad.boss_hp')}</span>
                            <span>{bossHp.toLocaleString()} / {maxBossHp.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-8 bg-gray-950 rounded-full overflow-hidden border border-red-900/50 relative shadow-inner">
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.4)_10px,rgba(0,0,0,0.4)_20px)] z-10 mix-blend-overlay"></div>
                            <div className="absolute inset-0 bg-red-500/10 z-20 animate-pulse"></div>
                            <div className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-400 transition-all duration-1000 relative z-0" style={{ width: `${(bossHp / maxBossHp) * 100}%` }}>
                                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]"></div>
                            </div>
                        </div>
                    </div>

                    {/* Temporary Overlay during Attack */}
                    {isDeploying && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                            <Target size={300} className="text-red-500 animate-ping opacity-30" />
                        </div>
                    )}

                    {bossHp <= 0 && (
                        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30 animate-in zoom-in backdrop-blur-md">
                            <div className="text-center p-8 border border-green-500/50 rounded-2xl bg-green-950/20 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                                <h2 className="text-5xl text-green-400 font-black glitch-text mb-4 uppercase tracking-widest">{t('squad.target_destroyed')}</h2>
                                <p className="text-green-300 font-mono text-xl">{t('squad.reward_xp').replace('{amount}', '5,000')}</p>
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
            <div className="p-6 h-full flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg animate-in zoom-in text-center relative z-20">
                <Trophy size={96} className="text-amber-400 mb-8 animate-bounce drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]" />
                <h2 className="text-5xl font-black text-white mb-4 uppercase italic tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{t('squad.mission_success')}</h2>

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
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-8 border border-white/10 text-center relative overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] group">
                <div className="absolute inset-0 bg-[url('/assets/aaa/grid-pattern.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-electric/10 blur-[100px] rounded-full group-hover:bg-electric/20 transition-all duration-700 pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="w-24 h-24 mx-auto bg-black/80 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-[0_0_30px_rgba(196,95,255,0.3)] hover:scale-110 transition-transform duration-500 text-white">
                        {userSquad?.avatar !== undefined && !isNaN(Number(userSquad.avatar))
                            ? React.createElement(SQUAD_ICONS[Number(userSquad.avatar)] || Shield, { size: 48 })
                            : <Shield size={48} />}
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

            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg hover:border-white/20 transition-all">
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
                <div className="space-y-3">
                    {userSquad?.members.map(m => (
                        <div key={m.id} className="flex items-center justify-between p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/5 hover:border-white/10 hover:bg-black/60 transition-all group">
                            <div className="flex items-center space-x-3">
                                <img src={m.avatar} className="w-8 h-8 rounded-lg bg-black object-cover" />
                                <span className="text-sm font-bold text-gray-200">{m.name}</span>
                            </div>
                            {m.role === 'leader' && <Crown size={16} className="text-amber-400 fill-amber-400/20" />}
                        </div>
                    ))}
                    {Array.from({ length: Math.max(0, 10 - (userSquad?.members.length || 0)) }).map((_, i) => (
                        <div key={i} className="p-4 rounded-xl border border-dashed border-white/10 bg-black/20 flex items-center justify-center text-xs text-gray-600 uppercase font-mono tracking-widest">
                            {t('squad.empty_slot')}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
