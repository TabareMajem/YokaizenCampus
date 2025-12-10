
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Sun, CloudRain, Music, Play, Sprout, HelpCircle } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';

interface CausalConservatoryProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

const MAX_DAYS = 5;

export const CausalConservatory: React.FC<CausalConservatoryProps> = ({ onComplete, t }) => {
  const [sunEnabled, setSunEnabled] = useState(false);
  const [waterEnabled, setWaterEnabled] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  
  const [simulating, setSimulating] = useState(false);
  const [day, setDay] = useState(0);
  const [growth, setGrowth] = useState(0); 
  const [health, setHealth] = useState(100); 
  const [logs, setLogs] = useState<string[]>([]);
  const [conclusion, setConclusion] = useState<'NONE' | 'CORRECT' | 'WRONG'>('NONE');

  const runDay = () => {
      setDay(d => d + 1);
      
      const dayLabel = t('causal.day');
      
      if (sunEnabled && waterEnabled) {
          setGrowth(g => Math.min(100, g + 25));
          setHealth(h => Math.min(100, h + 5));
          setLogs(prev => [`${dayLabel} ${day + 1}: ${t('causal.growth_surge')}`, ...prev]);
      } else if (sunEnabled && !waterEnabled) {
          setHealth(h => Math.max(0, h - 20));
          setLogs(prev => [`${dayLabel} ${day + 1}: ${t('causal.soil_arid')}`, ...prev]);
      } else if (!sunEnabled && waterEnabled) {
          setHealth(h => Math.max(0, h - 10));
          setGrowth(g => Math.min(100, g + 5));
          setLogs(prev => [`${dayLabel} ${day + 1}: ${t('causal.root_rot')}`, ...prev]);
      } else {
          setHealth(h => Math.max(0, h - 5));
          setLogs(prev => [`${dayLabel} ${day + 1}: ${t('causal.stasis')}`, ...prev]);
      }
  };

  useEffect(() => {
      if (simulating && day < MAX_DAYS && health > 0) {
          const timer = setTimeout(runDay, 800);
          return () => clearTimeout(timer);
      } else if (simulating) {
          setSimulating(false);
      }
  }, [simulating, day, health]);

  const handleStartSim = () => {
      setDay(0);
      setGrowth(0);
      setHealth(100);
      setLogs([]);
      setSimulating(true);
      audio.playClick();
  };

  const submitHypothesis = (cause: 'SUN' | 'WATER' | 'BOTH' | 'MUSIC') => {
      if (cause === 'BOTH') {
          setConclusion('CORRECT');
          audio.playSuccess();
          setTimeout(() => onComplete(100), 2000);
      } else {
          setConclusion('WRONG');
          audio.playError();
      }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 relative font-serif overflow-hidden">
        {/* Environment */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${sunEnabled && simulating ? 'bg-amber-100/10' : 'bg-slate-950'}`}></div>
        
        {/* Sun Shafts */}
        {sunEnabled && simulating && (
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-1/4 w-32 h-[150%] bg-gradient-to-b from-yellow-200/20 to-transparent transform rotate-12 blur-2xl animate-pulse-slow"></div>
                <div className="absolute top-[-20%] right-1/4 w-48 h-[150%] bg-gradient-to-b from-yellow-200/10 to-transparent transform -rotate-12 blur-3xl animate-pulse-slow delay-75"></div>
            </div>
        )}

        {/* Rain Particles */}
        {waterEnabled && simulating && (
            <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-fall"></div>
        )}

        {/* Note Particles */}
        {musicEnabled && simulating && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="text-4xl animate-float opacity-50">🎵</div>
            </div>
        )}

        {/* --- PLANT --- */}
        <div className="flex-1 relative flex items-end justify-center pb-12 z-10 perspective-[1000px]">
            <div className="relative w-40 flex flex-col items-center">
                {/* Stem */}
                <div 
                    className={`w-2 bg-green-600 rounded-full transition-all duration-700 ease-out origin-bottom relative ${health < 50 ? 'bg-yellow-700' : ''}`}
                    style={{ height: `${growth * 3}px` }}
                >
                    {/* Leaves */}
                    {growth > 20 && <div className="absolute top-[20%] -left-6 w-6 h-3 bg-green-500 rounded-full rounded-br-none rotate-[-30deg] shadow-lg"></div>}
                    {growth > 40 && <div className="absolute top-[40%] -right-6 w-8 h-4 bg-green-500 rounded-full rounded-bl-none rotate-[30deg] shadow-lg"></div>}
                    {growth > 60 && <div className="absolute top-[60%] -left-8 w-10 h-5 bg-green-500 rounded-full rounded-br-none rotate-[-20deg] shadow-lg"></div>}
                    
                    {/* Flower */}
                    {growth > 90 && health > 60 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 animate-in zoom-in duration-500">
                            <div className="absolute inset-0 bg-pink-500 rounded-full animate-pulse shadow-[0_0_20px_#ec4899]"></div>
                            <div className="absolute inset-4 bg-yellow-400 rounded-full"></div>
                        </div>
                    )}
                </div>
                
                {/* Pot */}
                <div className="w-32 h-24 bg-[#5d4037] rounded-b-3xl border-t-8 border-[#3e2723] shadow-2xl relative z-10"></div>
            </div>
        </div>

        {/* --- CONTROLS --- */}
        <div className="bg-black/80 backdrop-blur-xl border-t border-green-500/30 p-4 z-20">
            <div className="flex justify-between items-center mb-4">
                <div className="text-green-400 font-bold text-xs uppercase tracking-widest flex items-center">
                    <Sprout className="mr-2" size={16} /> {t('causal.log')}
                </div>
                <div className="text-xs text-gray-400">{t('causal.day')}: {day}/{MAX_DAYS}</div>
            </div>

            <div className="h-16 overflow-y-auto bg-black/50 rounded-lg p-2 mb-4 border border-white/10 font-mono text-[10px] text-green-200">
                {logs.length === 0 ? t('causal.awaiting') : logs.map((l, i) => <div key={i}>&gt; {l}</div>)}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
                <button onClick={() => setSunEnabled(!sunEnabled)} disabled={simulating} className={`p-3 rounded-xl border flex flex-col items-center transition-all ${sunEnabled ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_#facc15]' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>
                    <Sun size={24} className="mb-1"/> <span className="text-[9px] font-bold">{t('causal.sun')}</span>
                </button>
                <button onClick={() => setWaterEnabled(!waterEnabled)} disabled={simulating} className={`p-3 rounded-xl border flex flex-col items-center transition-all ${waterEnabled ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_#3b82f6]' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>
                    <CloudRain size={24} className="mb-1"/> <span className="text-[9px] font-bold">{t('causal.water')}</span>
                </button>
                <button onClick={() => setMusicEnabled(!musicEnabled)} disabled={simulating} className={`p-3 rounded-xl border flex flex-col items-center transition-all ${musicEnabled ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_#a855f7]' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>
                    <Music size={24} className="mb-1"/> <span className="text-[9px] font-bold">{t('causal.music')}</span>
                </button>
            </div>

            <Button fullWidth variant="primary" onClick={handleStartSim} disabled={simulating}>
                {simulating ? t('causal.observing') : <><Play size={16} className="mr-2"/> {t('causal.run')}</>}
            </Button>
        </div>

        {/* Modal */}
        {!simulating && day >= MAX_DAYS && conclusion === 'NONE' && (
            <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 animate-in zoom-in">
                <HelpCircle size={64} className="text-green-500 mb-6 animate-bounce" />
                <h3 className="text-2xl font-black text-white mb-6 text-center">{t('causal.analyze')}</h3>
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    <Button variant="secondary" onClick={() => submitHypothesis('SUN')}>{t('causal.sun_only')}</Button>
                    <Button variant="secondary" onClick={() => submitHypothesis('WATER')}>{t('causal.water_only')}</Button>
                    <Button variant="secondary" onClick={() => submitHypothesis('MUSIC')}>{t('causal.music_only')}</Button>
                    <Button variant="primary" onClick={() => submitHypothesis('BOTH')}>{t('causal.both')}</Button>
                </div>
            </div>
        )}
    </div>
  );
};
