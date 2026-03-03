
import React, { useState } from 'react';
import { Users, Shield, Zap, ChevronRight, Ghost, Sword, Zap as ZapIcon, Flame, Droplet, Wind, Mountain, Sun, Moon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Squad } from '../../types';

const SQUAD_ICONS = [<Ghost size={24} />, <Shield size={24} />, <Sword size={24} />, <ZapIcon size={24} />, <Flame size={24} />, <Droplet size={24} />, <Wind size={24} />, <Mountain size={24} />, <Sun size={24} />, <Moon size={24} />];

interface SquadOnboardingProps {
    isOpen: boolean;
    onClose: () => void;
    squads: Squad[];
    onJoin: (squadId: string) => void;
    t: (key: string) => string;
}

export const SquadOnboarding: React.FC<SquadOnboardingProps> = ({ isOpen, onClose, squads, onJoin, t }) => {
    const [step, setStep] = useState<'INTRO' | 'PICK'>('INTRO');

    const topSquads = [...squads].sort((a, b) => b.totalXp - a.totalXp).slice(0, 3);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" type="DEFAULT" maxWidth="max-w-4xl">
            <div className="flex flex-col md:flex-row gap-8 p-4">
                {/* Visual Side */}
                <div className="flex-1 bg-gradient-to-br from-indigo-900 to-black rounded-2xl p-8 relative overflow-hidden flex flex-col justify-center items-center text-center">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="relative z-10">
                        <div className="w-32 h-32 bg-electric/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-electric shadow-[0_0_50px_rgba(196,95,255,0.4)] animate-pulse-slow">
                            <Shield size={64} className="text-electric" />
                        </div>
                        <h2 className="text-3xl font-black text-white italic uppercase mb-2">Join the Elite</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Solo agents survive.<br />
                            <span className="text-electric font-bold">Squads dominate.</span>
                        </p>
                        <div className="mt-8 grid grid-cols-2 gap-4 text-left">
                            <div className="bg-black/60 p-4 rounded-xl border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] hover:border-yellow-400/50 transition-colors group">
                                <Zap size={24} className="text-yellow-400 mb-3 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Neural Link Perk</div>
                                <div className="text-sm font-black text-white mt-1">+10% XP Boost</div>
                            </div>
                            <div className="bg-black/60 p-4 rounded-xl border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] hover:border-cyan-400/50 transition-colors group">
                                <Users size={24} className="text-cyan-400 mb-3 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Network Access</div>
                                <div className="text-sm font-black text-white mt-1">War Room Raids</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Side */}
                <div className="flex-1 flex flex-col justify-center">
                    {step === 'INTRO' ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Operative, you are unaffiliated.</h3>
                                <p className="text-gray-400 text-sm">To access high-level raids and compete on the global stage, you must be part of a registered Unit.</p>
                            </div>
                            <div className="space-y-3">
                                <Button fullWidth variant="primary" size="lg" onClick={() => setStep('PICK')}>
                                    Find a Squad <ChevronRight className="ml-2" />
                                </Button>
                                <Button fullWidth variant="ghost" onClick={onClose}>
                                    Remain Solo (Not Recommended)
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold text-white">Recommended Units</h3>
                                <button onClick={() => setStep('INTRO')} className="text-xs text-gray-500 hover:text-white">Back</button>
                            </div>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {topSquads.map(squad => (
                                    <div key={squad.id} className="bg-black/60 border border-white/10 p-4 rounded-xl flex items-center justify-between group hover:border-electric hover:shadow-[0_0_20px_rgba(196,95,255,0.2)] transition-all cursor-pointer backdrop-blur-md" onClick={() => onJoin(squad.id)}>
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.1)] border border-white/10 group-hover:scale-110 transition-transform">
                                                {isNaN(Number(squad.avatar)) ? <Shield size={20} /> : SQUAD_ICONS[Number(squad.avatar)] || <Shield size={20} />}
                                            </div>
                                            <div>
                                                <div className="font-black text-white group-hover:text-electric transition-colors uppercase tracking-widest">{squad.name}</div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{squad.members?.length || 0}/10 Operatives</div>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">Deploy</Button>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center pt-4">
                                <button onClick={onClose} className="text-xs text-gray-500 hover:text-white">I'll browse later</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
