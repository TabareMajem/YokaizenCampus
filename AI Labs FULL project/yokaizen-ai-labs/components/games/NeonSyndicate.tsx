import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { interactWithNeonSyndicate } from '../../services/geminiService';
import { audio } from '../../services/audioService';
import { gameProgressService } from '../../services/gameProgressService';
import { useToast } from '../../contexts/ToastContext';
import { Scanlines } from '../ui/Visuals';
import { Scan, User, Eye, AlertTriangle, ShieldAlert, Search, Fingerprint, Lock } from 'lucide-react';
import { Language, Difficulty } from '../../types';

interface NeonSyndicateProps {
    onComplete: (score: number) => void;
    t: (key: string) => string;
    language?: Language;
    difficulty?: Difficulty;
}

// Sub components adapted to take translated props
const WantedPoster = ({ name, bounty, t }: { name: string; bounty: string, t: (key: string) => string }) => (
    <div className="relative h-64 w-48 overflow-hidden border-2 border-red-500 bg-black/90 p-4 shadow-[0_0_30px_rgba(220,38,38,0.6)] flex flex-col">
        <div className="absolute inset-0 animate-pulse bg-red-500/10 pointer-events-none"></div>
        <h1 className="font-mono text-3xl font-bold text-red-500 animate-pulse text-center mb-2 tracking-tighter">{t('syndicate.wanted')}</h1>
        <div className="my-2 h-32 w-full bg-gray-800 grayscale relative overflow-hidden border border-red-900">
            <div className="absolute inset-0 bg-[url('https://api.dicebear.com/7.x/avataaars/svg?seed=Villain')] bg-cover bg-center mix-blend-luminosity"></div>
            <div className="absolute inset-0 bg-red-500/20 mix-blend-overlay"></div>
        </div>
        <div className="font-mono text-xs text-white space-y-1">
            <p className="flex justify-between"><span>{t('syndicate.target')}:</span> <span className="text-red-300 font-bold">{name}</span></p>
            <p className="flex justify-between text-red-400"><span>{t('syndicate.bounty')}:</span> <span>{bounty}</span></p>
        </div>
        <p className="absolute bottom-1 left-4 right-4 text-[6px] text-gray-500 text-center tracking-widest uppercase">
            AUTH: NANOBANANA_SEC_PROTOCOL_V3 // DO NOT APPROACH
        </p>
    </div>
);

const IDCard = ({ name, job, level, t }: { name: string, job: string, level: string, t: (key: string) => string }) => (
    <div className="w-full max-w-sm h-48 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl relative group transform hover:scale-[1.02] transition-transform duration-300">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-30 pointer-events-none"></div>

        <div className="flex h-full">
            <div className="w-1/3 bg-slate-800 relative overflow-hidden border-r border-slate-700">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} className="w-full h-full object-cover opacity-80 grayscale contrast-125" />
                <div className="absolute bottom-2 left-0 right-0 text-center">
                    <div className="bg-cyan-500 text-black text-[8px] font-bold px-2 py-0.5 inline-block rounded">LVL {level}</div>
                </div>
                <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay"></div>
            </div >

            <div className="flex-1 p-4 flex flex-col justify-between relative bg-gradient-to-br from-slate-900 to-black">
                <div>
                    <div className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">{t('syndicate.id_card')}</div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">{name}</h2>
                    <p className="text-xs text-cyan-400 font-mono">{job}</p>
                </div>

                <div className="space-y-1">
                    <div className="h-1 w-full bg-slate-800 rounded overflow-hidden">
                        <div className="h-full w-3/4 bg-cyan-600 animate-pulse"></div>
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                        <span>CLR: A-CLASS</span>
                        <span>EXP: 2099</span>
                    </div>
                </div>

                <Fingerprint className="absolute bottom-4 right-4 text-slate-700 opacity-20 w-16 h-16" />
            </div>
        </div >
    </div >
);

export const NeonSyndicate: React.FC<NeonSyndicateProps> = ({ onComplete, t = (k) => k, language = 'EN', difficulty = 'Pro' }) => {
    const [view, setView] = useState<'SCAN' | 'PROFILE' | 'WANTED' | 'GAME_OVER'>('SCAN');
    const [reputation, setReputation] = useState(50); // 0 (Wanted) to 100 (Hero)
    const [targetData, setTargetData] = useState<any>(null);
    const [scanning, setScanning] = useState(false);
    const [leverageRevealed, setLeverageRevealed] = useState(false);
    const [credits, setCredits] = useState(0); // New state for credits
    const [heat, setHeat] = useState(0);       // New state for heat
    const [members, setMembers] = useState(0); // New state for members
    const [districts, setDistricts] = useState(0); // New state for districts
    const { showToast } = useToast();

    const handleScan = async () => {
        setScanning(true);
        const serviceDiff = difficulty === 'Rookie' ? 'ROOKIE' : 'ELITE';

        try {
            const data = await interactWithNeonSyndicate("Kenji Sato", serviceDiff, language as Language);
            setTargetData(data);
            setTimeout(() => {
                setScanning(false);
                setView('PROFILE');

                // Persist progress
                gameProgressService.save('neon_syndicate', {
                    highScore: reputation,
                    lastPlayed: new Date(),
                    customData: {
                        reputation,
                        credits,
                        heat,
                        members,
                        districts
                    }
                });

                audio.playError();
            }, 1500);
        } catch (e) {
            setScanning(false);
            showToast("Scan failed. Neural link disrupted.", 'error');
        }
    };

    const handleAction = (action: 'BLACKMAIL' | 'EXPOSE') => {
        const risk = difficulty === 'Elite' ? 40 : 20;

        if (action === 'BLACKMAIL') {
            setReputation(r => Math.max(0, r - risk));
        } else {
            setReputation(r => Math.min(100, r + 20));
        }

        if (reputation < 20 || action === 'BLACKMAIL') {
            setView('WANTED');
        } else {
            setTimeout(() => onComplete(100), 1500);
        }
    };

    return (
        <div className="h-full flex flex-col bg-black relative overflow-hidden font-sans">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/tokyonight/800/1200')] bg-cover bg-center opacity-30 blur-sm transition-all duration-1000"
                style={{ filter: view === 'WANTED' ? 'grayscale(100%) contrast(120%)' : 'none' }}>
            </div>

            <div className="absolute inset-0 pointer-events-none z-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-20"></div>

            {/* HUD */}
            <div className="relative z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black to-transparent">
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${reputation < 30 ? 'bg-red-500 animate-ping' : 'bg-cyan-500'}`}></div>
                    <span className="text-xs font-bold text-white tracking-widest">{t('syndicate.rep')}: {reputation}</span>
                </div>
                <div className="text-xs font-mono text-gray-400">{t('syndicate.sec_net')}: {difficulty.toUpperCase()}</div>
            </div>

            <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6">

                {view === 'SCAN' && (
                    <div className="w-full max-w-sm flex flex-col items-center space-y-8 animate-in zoom-in">
                        <div className="relative w-64 h-64 border-2 border-cyan-500/30 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="absolute inset-0 border-2 border-cyan-500/10 rounded-full animate-ping"></div>
                            <div className="absolute inset-4 border border-cyan-500/20 rounded-full animate-spin-slow"></div>
                            <Scan size={64} className={`text-cyan-400 ${scanning ? 'animate-spin' : ''}`} />
                            {scanning && <div className="absolute top-full mt-4 text-cyan-400 text-xs font-mono animate-pulse">{t('syndicate.acquiring')}</div>}
                        </div>

                        {!scanning && (
                            <div className="text-center space-y-4">
                                <h2 className="text-2xl font-black text-white uppercase italic drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{t('syndicate.social_graph')}</h2>
                                <p className="text-gray-400 text-sm max-w-xs">
                                    {t('syndicate.scan_desc')}
                                </p>
                                <Button size="lg" variant="primary" onClick={handleScan} className="shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                                    <Eye className="mr-2" size={18} /> {t('syndicate.init_scan')}
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {view === 'PROFILE' && targetData && (
                    <div className="w-full max-w-sm space-y-6 animate-in slide-in-from-bottom">
                        <IDCard name={targetData.npcName} job={targetData.job} level="5" t={t} />

                        <div className="bg-black/80 border border-white/10 rounded-xl p-4 backdrop-blur-md">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center"><Lock size={12} className="mr-2" /> {t('syndicate.encrypted')}</h3>

                            {leverageRevealed ? (
                                <div className="space-y-3 animate-in fade-in">
                                    <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-red-200 text-sm font-medium flex items-start">
                                        <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                                        {targetData.hiddenTrait}
                                    </div>
                                    <div className="text-xs text-gray-400 italic border-l-2 border-gray-700 pl-2">
                                        "{targetData.dialogue}"
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <Button variant="danger" onClick={() => handleAction('BLACKMAIL')}>{t('syndicate.blackmail')}</Button>
                                        <Button variant="primary" onClick={() => handleAction('EXPOSE')}>{t('syndicate.expose')}</Button>
                                    </div>
                                </div>
                            ) : (
                                <Button fullWidth variant="secondary" onClick={() => setLeverageRevealed(true)} className="h-20 border-dashed hover:bg-white/5">
                                    <Search className="mr-2" size={16} /> {t('syndicate.decrypt')}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {view === 'WANTED' && (
                    <div className="flex flex-col items-center space-y-6 animate-in zoom-in duration-300">
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500 blur-[100px] opacity-20 animate-pulse"></div>
                            <WantedPoster name="YOU" bounty="¥5,000,000" t={t} />
                        </div>

                        <div className="text-center max-w-xs">
                            <h2 className="text-red-500 font-black text-2xl mb-2 glitch-text">{t('syndicate.system_alert')}</h2>
                            <p className="text-red-200/70 text-xs">
                                {t('syndicate.reputation_collapse')}
                            </p>
                        </div>

                        <Button variant="secondary" onClick={() => { setView('SCAN'); setReputation(50); setLeverageRevealed(false); }}>
                            {t('syndicate.identity_reset')}
                        </Button>
                    </div>
                )}

            </div>

            {view !== 'SCAN' && (
                <div className="absolute bottom-0 w-full h-32 pointer-events-none flex justify-between items-end px-4 opacity-50">
                    <div className={`w-16 h-24 bg-black border border-gray-800 mb-4 flex flex-col items-center justify-center p-1 ${view === 'WANTED' ? 'border-red-500 animate-pulse' : ''}`}>
                        <div className="text-[6px] text-gray-500 text-center">{t('syndicate.city_news')}</div>
                        <div className={`text-[8px] font-bold text-center ${view === 'WANTED' ? 'text-red-500' : 'text-cyan-500'}`}>
                            {view === 'WANTED' ? t('syndicate.criminal') : t('syndicate.buy_cola')}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
