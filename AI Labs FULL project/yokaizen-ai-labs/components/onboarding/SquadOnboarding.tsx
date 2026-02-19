
import React, { useState } from 'react';
import { Users, Shield, Zap, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Squad } from '../../types';

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
                            <div className="bg-black/40 p-3 rounded-lg border border-white/10">
                                <Zap size={20} className="text-yellow-400 mb-2" />
                                <div className="text-xs font-bold text-gray-400 uppercase">Perk</div>
                                <div className="text-sm font-bold text-white">+10% XP Boost</div>
                            </div>
                            <div className="bg-black/40 p-3 rounded-lg border border-white/10">
                                <Users size={20} className="text-cyan-400 mb-2" />
                                <div className="text-xs font-bold text-gray-400 uppercase">Access</div>
                                <div className="text-sm font-bold text-white">War Room Raids</div>
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
                                    <div key={squad.id} className="bg-gray-900 border border-white/10 p-4 rounded-xl flex items-center justify-between group hover:border-electric transition-colors cursor-pointer" onClick={() => onJoin(squad.id)}>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-2xl">{squad.avatar}</div>
                                            <div>
                                                <div className="font-bold text-white group-hover:text-electric transition-colors">{squad.name}</div>
                                                <div className="text-xs text-gray-500">{squad.members.length}/10 Operatives</div>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="secondary">Join</Button>
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
