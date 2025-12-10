
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { interactWithEntropy, generateMockImage } from '../../services/geminiService';
import { Box, Zap, Clock, Atom, Wand2 } from 'lucide-react';
import { Language } from '../../types';

interface EntropySandboxProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

export const EntropySandbox: React.FC<EntropySandboxProps> = ({ onComplete, t, language = 'EN' }) => {
  const PARTS = useMemo(() => [
      { id: 'gear', name: t('entropy.p_gear'), icon: '⚙️' },
      { id: 'block', name: t('entropy.p_cube'), icon: '🧊' },
      { id: 'wheel', name: t('entropy.p_wheel'), icon: '🛞' },
  ], [t]);

  const MODIFIERS = useMemo(() => [
      { id: 'rust', name: t('entropy.m_rust'), desc: t('entropy.d_rust') },
      { id: 'rubber', name: t('entropy.m_rubber'), desc: t('entropy.d_rubber') },
      { id: 'zero_g', name: t('entropy.m_zerog'), desc: t('entropy.d_zerog') },
      { id: 'time_dil', name: t('entropy.m_time'), desc: t('entropy.d_time') },
  ], [t]);

  const [activePart, setActivePart] = useState<typeof PARTS[0] | null>(null);
  const [selectedMod, setSelectedMod] = useState<typeof MODIFIERS[0] | null>(null);
  const [time, setTime] = useState(0);
  
  // Simulation State
  const [isMaterializing, setIsMaterializing] = useState(false);
  const [result, setResult] = useState<{ physics: string, visualPrompt: string, shaderLogic: string, imageUrl?: string } | null>(null);
  
  const handleMaterialize = async () => {
      if (!activePart || !selectedMod) return;
      
      setIsMaterializing(true);
      const logic = await interactWithEntropy(activePart.name, selectedMod.name, language as Language);
      const imageUrl = await generateMockImage(logic.visualPrompt);
      
      setResult({ ...logic, imageUrl });
      setIsMaterializing(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 font-mono relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:30px_30px]"></div>

        <div className="p-4 border-b border-white/10 bg-black/80 backdrop-blur-md z-10 flex justify-between items-center">
            <div>
                <h2 className="text-lg font-bold text-white flex items-center">
                    <Atom className="mr-2 text-amber-500" /> {t('entropy.title')}
                </h2>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t('entropy.subtitle')}</p>
            </div>
            <div className="text-xs font-bold text-amber-500 border border-amber-500/30 px-2 py-1 rounded bg-amber-900/10">
                NANO BANANA PRO
            </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="flex-1 relative bg-black flex items-center justify-center p-6 border-r border-white/10">
                <div className="relative w-64 h-64">
                    <div 
                        className={`absolute inset-0 flex items-center justify-center bg-gray-800 rounded-xl border-2 border-gray-700 transition-opacity duration-500 ${result ? 'opacity-0' : 'opacity-100'}`}
                        style={{ opacity: result ? 1 - (time/100) : 1 }}
                    >
                        {activePart ? (
                            <div className="text-6xl">{activePart.icon}</div>
                        ) : (
                            <div className="text-gray-600 text-xs uppercase">{t('entropy.no_object')}</div>
                        )}
                    </div>

                    {result && result.imageUrl && (
                        <div 
                            className="absolute inset-0 rounded-xl overflow-hidden border-2 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-opacity duration-500"
                            style={{ opacity: time / 100 }}
                        >
                            <img src={result.imageUrl} className="w-full h-full object-cover" alt="Materialized" />
                            <div className="absolute inset-0 bg-amber-500/10 mix-blend-overlay"></div>
                        </div>
                    )}
                </div>

                <div className="absolute bottom-6 left-6 right-6 bg-black/60 p-3 rounded-xl border border-white/10 backdrop-blur">
                    <div className="flex justify-between text-xs text-gray-400 mb-2 uppercase font-bold">
                        <span>{t('entropy.base_state')}</span>
                        <span className="text-amber-500">{t('entropy.entropy')}: {time}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={time} 
                        onChange={(e) => setTime(parseInt(e.target.value))}
                        className="w-full accent-amber-500"
                    />
                </div>
            </div>

            <div className="w-full md:w-80 bg-gray-900 border-l border-white/10 flex flex-col z-10 overflow-y-auto">
                <div className="p-4 space-y-6">
                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block flex items-center"><Box size={10} className="mr-1"/> {t('entropy.select_blueprint')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {PARTS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => { setActivePart(p); setResult(null); setTime(0); }}
                                    className={`p-2 rounded border flex flex-col items-center transition-all ${
                                        activePart?.id === p.id 
                                        ? 'bg-amber-500/20 border-amber-500 text-white' 
                                        : 'bg-black border-gray-700 text-gray-500 hover:border-gray-500'
                                    }`}
                                >
                                    <span className="text-xl mb-1">{p.icon}</span>
                                    <span className="text-[9px] uppercase font-bold">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block flex items-center"><Wand2 size={10} className="mr-1"/> {t('entropy.apply_logic')}</label>
                        <div className="space-y-2">
                            {MODIFIERS.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => { setSelectedMod(m); setResult(null); setTime(0); }}
                                    className={`w-full p-3 rounded text-left border transition-all ${
                                        selectedMod?.id === m.id 
                                        ? 'bg-amber-900/30 border-amber-500 text-amber-100' 
                                        : 'bg-black border-gray-700 text-gray-400 hover:bg-gray-800'
                                    }`}
                                >
                                    <div className="text-xs font-bold">{m.name}</div>
                                    <div className="text-[9px] opacity-70">{m.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button 
                        fullWidth 
                        variant="primary" 
                        onClick={handleMaterialize} 
                        disabled={!activePart || !selectedMod || isMaterializing}
                        className="shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                    >
                        {isMaterializing ? <span className="animate-pulse">{t('entropy.calculating')}</span> : <><Zap size={16} className="mr-2"/> {t('entropy.materialize')}</>}
                    </Button>

                    {result && (
                        <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-3 animate-in slide-in-from-bottom">
                            <div>
                                <div className="text-[9px] text-amber-500 font-bold uppercase mb-1">{t('entropy.log')}</div>
                                <p className="text-xs text-gray-300 leading-relaxed border-l-2 border-amber-500 pl-2">
                                    {result.physics}
                                </p>
                            </div>
                            <div>
                                <div className="text-[9px] text-blue-400 font-bold uppercase mb-1">{t('entropy.shader')}</div>
                                <pre className="text-[8px] font-mono text-blue-300 bg-gray-900 p-2 rounded overflow-x-auto">
                                    {result.shaderLogic}
                                </pre>
                            </div>
                            
                            <Button size="sm" fullWidth variant="secondary" onClick={() => onComplete(100)}>
                                {t('entropy.save')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
