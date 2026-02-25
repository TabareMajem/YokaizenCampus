
import React, { useState } from 'react';
import { TutorialContent, Difficulty } from '../../types';
import { Button } from './Button';
import { Play, Info, Shield, Zap, Skull, MousePointer, Hand } from 'lucide-react';

interface GameTutorialProps {
    content: TutorialContent;
    onStart: (difficulty: Difficulty) => void;
    t?: (key: string) => string;
    defaultDifficulty?: Difficulty;
}

export const GameTutorial: React.FC<GameTutorialProps> = ({ content, onStart, t, defaultDifficulty = 'Pro' }) => {
    const [selectedDiff, setSelectedDiff] = useState<Difficulty>(defaultDifficulty);

    // Extract game type ID from tutorial ID (e.g., "tut_BIO_GUARD" -> "bio_guard")
    const gameKey = content.id.replace('tut_', '').toLowerCase();

    const difficulties: { id: Difficulty, label: string, icon: React.ReactNode, color: string }[] = [
        { id: 'Rookie', label: 'Rookie', icon: <Shield size={14} />, color: 'bg-green-500/20 border-green-500 text-green-400' },
        { id: 'Pro', label: 'Pro', icon: <Zap size={14} />, color: 'bg-blue-500/20 border-blue-500 text-blue-400' },
        { id: 'Elite', label: 'Elite', icon: <Skull size={14} />, color: 'bg-red-500/20 border-red-500 text-red-400' }
    ];

    return (
        <div className="fixed inset-0 z-[60] bg-void/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="max-w-[90vw] md:max-w-sm w-full space-y-4 md:space-y-6 text-center relative max-h-[85vh] overflow-y-auto scrollbar-hide py-4 md:py-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-electric/10 blur-[80px] rounded-full pointer-events-none"></div>

                <div className="animate-in zoom-in duration-500 delay-100 relative z-10">
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-electric/10 rounded-2xl flex items-center justify-center border border-electric/50 shadow-[0_0_40px_rgba(196,95,255,0.2)] mb-4 md:mb-6 rotate-3 backdrop-blur-md">
                        <Info className="text-electric w-8 h-8 md:w-10 md:h-10" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-wider mb-2">
                        {t ? t(`game.${gameKey}.title`) : content.title}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        <span className="font-bold text-electric uppercase mr-1">{t ? t('tutorial.objective') : 'Objective'}:</span>
                        {content.objective}
                    </p>
                </div>

                <div className="animate-in slide-in-from-bottom duration-500 delay-150">
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block tracking-widest">Clearance Level</label>
                    <div className="flex flex-col md:flex-row gap-2 space-y-0 md:space-x-2">
                        {difficulties.map(d => (
                            <button
                                key={d.id}
                                onClick={() => setSelectedDiff(d.id)}
                                className={`flex-1 py-2 md:py-3 px-2 rounded-xl border transition-all duration-200 flex flex-row md:flex-col items-center justify-center gap-2 md:gap-0 ${selectedDiff === d.id
                                        ? d.color + ' shadow-[0_0_15px_rgba(0,0,0,0.3)] scale-105'
                                        : 'bg-gray-900/50 border-gray-700 text-gray-500 hover:bg-gray-800'
                                    }`}
                            >
                                <div className="mb-0 md:mb-1">{d.icon}</div>
                                <span className="text-[10px] font-bold uppercase">{d.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {content.controls && content.controls.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in slide-in-from-bottom duration-500 delay-200">
                        {content.controls.map((ctrl, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center justify-center space-x-2 text-xs text-gray-300">
                                <span className="font-bold text-white">{ctrl.icon}</span>
                                <span>{ctrl.text}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4 text-left animate-in slide-in-from-bottom duration-500 delay-300 backdrop-blur-sm">
                    <h3 className="text-[10px] font-bold text-amber-500 uppercase mb-2 flex items-center"><Zap size={10} className="mr-1" /> {t ? t('tutorial.pro_tip') : 'Pro Tip'}</h3>
                    <ul className="list-disc list-inside text-xs text-gray-300 space-y-1">
                        {content.tips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                        ))}
                    </ul>
                </div>

                <Button fullWidth size="lg" variant="primary" onClick={() => onStart(selectedDiff)} className="animate-in fade-in duration-500 delay-500 shadow-[0_0_20px_rgba(196,95,255,0.4)]">
                    <Play fill="currentColor" className="mr-2" /> {t ? t('tutorial.start_btn') : 'INITIALIZE MISSION'}
                </Button>
            </div>
        </div>
    );
};
