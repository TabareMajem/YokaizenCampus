
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../ui/Button';
import { interactWithXenoflora } from '../../services/geminiService';
import { ArrowUp, PenTool, Wind, Anchor, ChevronUp, Thermometer, Activity, Dna, AlertTriangle, ShieldAlert, Droplets, Radar, Volume2, VolumeX, Zap } from 'lucide-react';
import { Language } from '../../types';

interface XenofloraProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

// --- ASSETS ---
const GaleWhaleIcon = () => (
  <svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(56,189,248,0.5)] animate-float">
    <path d="M64 8C32 8 12 32 12 64C12 96 32 120 64 120C96 120 116 96 116 64" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" className="animate-pulse-slow"/>
    <path d="M64 120V100M54 100H74" stroke="#F472B6" strokeWidth="6"/>
    <circle cx="64" cy="64" r="24" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4 4" className="animate-spin-slow"/>
    <text x="64" y="64" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontFamily="monospace" dy="4">{t('games.xenoflora.bio_form')}</text>
  </svg>
);

type Sample = { id: string, name: string, color: string, trait: string };
type HazardType = 'NONE' | 'PREDATOR' | 'CURRENT';

export const Xenoflora: React.FC<XenofloraProps> = ({ onComplete, t, language = 'EN' }) => {
  // UseMemo for localized samples
  const AVAILABLE_SAMPLES = useMemo<Sample[]>(() => [
      { id: 's1', name: t('xenoflora.s_plankton'), color: 'bg-cyan-400', trait: t('xenoflora.t_biolum') },
      { id: 's2', name: t('xenoflora.s_gas'), color: 'bg-pink-400', trait: t('xenoflora.t_buoyancy') },
      { id: 's3', name: t('xenoflora.s_shell'), color: 'bg-amber-400', trait: t('xenoflora.t_armor') },
      { id: 's4', name: t('xenoflora.s_jet'), color: 'bg-purple-400', trait: t('xenoflora.t_jet') },
  ], [t]);

  // Game State
  const [phase, setPhase] = useState<'BRIEFING' | 'ASCENT' | 'DESIGN' | 'ANALYSIS' | 'GAME_OVER'>('BRIEFING');
  const [altitude, setAltitude] = useState(0); // 0 to 5000m
  const [hull, setHull] = useState(100);
  const [heat, setHeat] = useState(0); // 0 to 100 (Noise/Heat)
  
  // Gameplay Mechanics
  const [isThrusting, setIsThrusting] = useState(false);
  const [silentRunning, setSilentRunning] = useState(false);
  const [hazard, setHazard] = useState<{type: HazardType, intensity: number}>({ type: 'NONE', intensity: 0 });
  const [predatorDistance, setPredatorDistance] = useState(100); // 100 = Far, 0 = Attack
  
  // Collection
  const [activeSample, setActiveSample] = useState<Sample | null>(null);
  const [collectedSamples, setCollectedSamples] = useState<Sample[]>([]);
  
  // Design State
  const [creaturePrompt, setCreaturePrompt] = useState('');
  const [isDesigning, setIsDesigning] = useState(false);
  const [creatureData, setCreatureData] = useState<{ biology: string, consistencyScore: number, feedback: string } | null>(null);

  // Refs for Game Loop
  const loopRef = useRef<number | null>(null);
  const gameStateRef = useRef({ altitude: 0, heat: 0, hull: 100, isThrusting: false, silentRunning: false, hazard, predatorDistance });

  // Sync Refs
  useEffect(() => {
      gameStateRef.current = { altitude, heat, hull, isThrusting, silentRunning, hazard, predatorDistance };
  }, [altitude, heat, hull, isThrusting, silentRunning, hazard, predatorDistance]);

  // --- PHYSICS LOOP ---
  useEffect(() => {
      if (phase !== 'ASCENT') return;

      // @ts-ignore
      loopRef.current = window.setInterval(() => {
          const state = gameStateRef.current;
          let newAlt = state.altitude;
          let newHeat = state.heat;
          let newHull = state.hull;
          let newPredDist = state.predatorDistance;
          
          // 1. Physics & Movement
          const gravity = 5;
          let thrustPower = 0;

          if (state.isThrusting && !state.silentRunning) {
              thrustPower = 20; 
              newHeat += 2; // Rapid heat buildup
          } else {
              newHeat -= state.silentRunning ? 3 : 1; // Cooling
          }

          // Apply Hazards
          if (state.hazard.type === 'CURRENT') {
              newAlt -= (state.hazard.intensity * 0.5); 
              if (state.heat > 80) newHull -= 0.2;
          }

          // Net movement
          newAlt += (thrustPower - gravity);

          // Clamp Physics
          newAlt = Math.max(0, Math.min(5000, newAlt));
          newHeat = Math.max(0, Math.min(100, newHeat));

          // 2. Predator Logic
          if (state.hazard.type === 'PREDATOR') {
              const noiseLevel = state.silentRunning ? 0 : (state.isThrusting ? 5 : (state.heat > 30 ? 2 : -1));
              newPredDist -= noiseLevel;
              if (newPredDist <= 0) {
                  newHull -= 15;
                  newPredDist = 50; 
              } else if (newPredDist > 100) {
                  newPredDist = 100;
              }
          } else {
              newPredDist = Math.min(100, newPredDist + 1);
          }

          // 3. Overheat Damage
          if (newHeat >= 100) {
              newHull -= 0.5;
          }

          // 4. Win/Lose Checks
          if (newHull <= 0) {
              setPhase('GAME_OVER');
              if (loopRef.current) clearInterval(loopRef.current);
          }
          if (newAlt >= 5000) {
              setPhase('DESIGN');
              if (loopRef.current) clearInterval(loopRef.current);
          }

          setAltitude(newAlt);
          setHeat(newHeat);
          setHull(newHull);
          setPredatorDistance(newPredDist);

      }, 50);

      // Event Spawner
      const spawner = setInterval(() => {
          if (gameStateRef.current.altitude >= 4800) return;

          const roll = Math.random();
          if (gameStateRef.current.hazard.type === 'NONE') {
              if (roll > 0.8) {
                  setHazard({ type: 'PREDATOR', intensity: 100 });
                  setTimeout(() => setHazard({ type: 'NONE', intensity: 0 }), 8000);
              } else if (roll > 0.6) {
                  setHazard({ type: 'CURRENT', intensity: Math.random() * 30 + 20 });
                  setTimeout(() => setHazard({ type: 'NONE', intensity: 0 }), 5000);
              }
          }

          if (Math.random() > 0.7 && !activeSample) {
              const s = AVAILABLE_SAMPLES[Math.floor(Math.random() * AVAILABLE_SAMPLES.length)];
              setActiveSample(s);
              setTimeout(() => setActiveSample(null), 4000);
          }
      }, 2000);

      return () => {
          if (loopRef.current) clearInterval(loopRef.current);
          clearInterval(spawner);
      };
  }, [phase, activeSample, AVAILABLE_SAMPLES]);

  const handleCollectSample = (s: Sample) => {
      if (!collectedSamples.some(cs => cs.id === s.id)) {
          setCollectedSamples(prev => [...prev, s]);
      }
      setActiveSample(null);
  };

  const handleDesign = async () => {
      if (!creaturePrompt) return;
      setIsDesigning(true);
      
      const fullPrompt = `${creaturePrompt}. Incorporated Traits: ${collectedSamples.map(s => s.trait).join(', ')}.`;
      
      const result = await interactWithXenoflora(5000, fullPrompt, language as Language);
      setCreatureData(result);
      setIsDesigning(false);
      setPhase('ANALYSIS');

      if (result.consistencyScore > 80) {
          setTimeout(() => {
              onComplete(100);
          }, 4000);
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#020617] relative overflow-hidden font-mono select-none">
        <div 
            className="absolute inset-0 pointer-events-none transition-colors duration-1000"
            style={{ 
                background: `linear-gradient(to bottom, #0f172a 0%, #020617 ${Math.max(0, 100 - (altitude / 50))}%)`,
                opacity: 0.8
            }}
        ></div>
        
        <div className="absolute inset-0 pointer-events-none opacity-30">
            {[...Array(20)].map((_, i) => (
                <div 
                   key={i}
                   className="absolute w-1 h-1 bg-teal-400 rounded-full animate-float"
                   style={{
                       left: `${Math.random() * 100}%`,
                       top: `${Math.random() * 100}%`,
                       animationDuration: `${Math.random() * 5 + 3}s`
                   }}
                />
            ))}
        </div>

        {/* --- HUD --- */}
        <div className="relative z-10 p-4 border-b border-teal-900/30 bg-black/40 backdrop-blur-md flex justify-between items-center">
            <div>
                <div className="text-[10px] text-teal-500 uppercase tracking-widest mb-1">{t('xenoflora.hull')}</div>
                <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all ${hull < 30 ? 'bg-red-500 animate-pulse' : 'bg-teal-500'}`} 
                        style={{ width: `${hull}%` }}
                    ></div>
                </div>
            </div>
            
            <div className="absolute left-1/2 -translate-x-1/2 top-4">
                {hazard.type === 'PREDATOR' && (
                    <div className="flex items-center text-red-500 font-bold animate-pulse text-xs">
                        <ShieldAlert size={14} className="mr-1"/> {t('xenoflora.leviathan')}
                    </div>
                )}
                {hazard.type === 'CURRENT' && (
                    <div className="flex items-center text-amber-500 font-bold animate-bounce text-xs">
                        <Wind size={14} className="mr-1"/> {t('xenoflora.current')}
                    </div>
                )}
            </div>

            <div className="text-right">
                <div className="text-[10px] text-teal-500 uppercase tracking-widest mb-1">{t('xenoflora.altitude')}</div>
                <div className="text-2xl font-black text-white font-mono">
                    {Math.floor(altitude)}<span className="text-sm text-gray-500">m</span>
                </div>
            </div>
        </div>

        {/* --- MAIN VIEWPORT --- */}
        <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden">
            
            {phase === 'BRIEFING' && (
                <div className="text-center space-y-6 max-w-xs animate-in zoom-in">
                    <div className="w-32 h-32 mx-auto border-2 border-dashed border-teal-500 rounded-full flex items-center justify-center animate-spin-slow">
                        <Anchor className="text-teal-500" size={48} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">{t('xenoflora.mission')}</h2>
                        <p className="text-sm text-gray-400 mb-4">
                            {t('xenoflora.briefing')}
                        </p>
                        <Button fullWidth size="lg" variant="primary" onClick={() => setPhase('ASCENT')}>
                            {t('xenoflora.engage')}
                        </Button>
                    </div>
                </div>
            )}

            {phase === 'ASCENT' && (
                <div className="w-full h-full relative flex flex-col justify-between">
                    <div className="absolute top-4 right-4 w-24 h-24 bg-black/60 rounded-full border border-teal-500/30 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 border border-teal-500/10 rounded-full scale-50"></div>
                        <div className="w-full h-0.5 bg-teal-500/20 absolute top-1/2 -translate-y-1/2 animate-scan"></div>
                        <div className="w-0.5 h-full bg-teal-500/20 absolute left-1/2 -translate-x-1/2"></div>
                        
                        {hazard.type === 'PREDATOR' && (
                            <div 
                                className="absolute w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red] animate-ping"
                                style={{ 
                                    top: '50%', 
                                    left: '50%', 
                                    transform: `translate(${Math.sin(Date.now()/500)*20}px, ${-predatorDistance/2}px)` 
                                }}
                            ></div>
                        )}
                        <div className="absolute bottom-1 text-[8px] text-teal-500">{t('xenoflora.radar')}</div>
                    </div>

                    <div className="flex-1 flex items-center justify-center relative">
                        <div className={`w-64 h-64 border-2 rounded-full flex items-center justify-center transition-colors duration-300 relative ${
                            heat > 80 ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-teal-500/30'
                        }`}>
                            {silentRunning && (
                                <div className="absolute inset-0 bg-blue-900/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-pulse">
                                    <div className="text-blue-300 font-bold tracking-widest text-xs border border-blue-500 px-2 py-1 rounded">{t('xenoflora.stealth')}</div>
                                </div>
                            )}

                            <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                            
                            {activeSample && (
                                <button
                                    onClick={() => handleCollectSample(activeSample)}
                                    className="absolute z-20 animate-float-fast flex flex-col items-center transition-transform active:scale-90 cursor-pointer"
                                    style={{ top: '20%' }}
                                >
                                    <div className={`w-12 h-12 ${activeSample.color} rounded-full blur-md absolute opacity-50 animate-pulse`}></div>
                                    <div className="relative z-10 bg-black/80 border border-white/20 p-2 rounded-full">
                                        <Dna size={20} className="text-white" />
                                    </div>
                                    <span className="mt-1 text-[8px] font-bold text-white bg-black/50 px-2 rounded">{activeSample.name}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="w-full flex flex-col space-y-4 pb-4">
                        <div className="flex items-center space-x-2 px-4">
                            <Thermometer size={16} className={heat > 80 ? 'text-red-500' : 'text-teal-500'} />
                            <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700 relative">
                                <div className="absolute inset-0 flex items-center justify-center text-[8px] text-white font-bold z-10 mix-blend-difference">{t('games.xenoflora.noise')}</div>
                                <div 
                                    className={`h-full transition-all duration-200 ${heat > 80 ? 'bg-red-500' : 'bg-teal-500'}`}
                                    style={{ width: `${heat}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 px-4 h-24">
                            <button 
                                className={`rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                                    silentRunning 
                                    ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_#2563eb] text-white' 
                                    : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-blue-500/50'
                                }`}
                                onClick={() => {
                                    setSilentRunning(!silentRunning);
                                    setIsThrusting(false);
                                }}
                            >
                                {silentRunning ? <VolumeX size={24} className="mb-1"/> : <Volume2 size={24} className="mb-1"/>}
                                <span className="text-[9px] font-bold">{t('xenoflora.stealth')}</span>
                            </button>

                            <button
                                className={`rounded-xl border-2 transition-all duration-100 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] active:scale-95 touch-manipulation ${
                                    isThrusting 
                                    ? 'bg-teal-500 border-teal-300 shadow-[0_0_20px_#14b8a6] scale-105' 
                                    : silentRunning ? 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed' : 'bg-gray-900 border-teal-900 hover:border-teal-500'
                                }`}
                                onPointerDown={() => !silentRunning && setIsThrusting(true)}
                                onPointerUp={() => setIsThrusting(false)}
                                onPointerLeave={() => setIsThrusting(false)}
                                disabled={silentRunning}
                            >
                                <ChevronUp size={32} className={`mb-1 ${isThrusting ? 'text-white animate-bounce' : 'text-gray-500'}`} />
                                <span className={`text-[10px] font-bold ${isThrusting ? 'text-white' : 'text-gray-500'}`}>
                                    {silentRunning ? t('xenoflora.disabled') : t('xenoflora.burn')}
                                </span>
                            </button>

                            <button 
                                className="rounded-xl border-2 border-gray-800 bg-gray-900 text-gray-600 flex flex-col items-center justify-center opacity-50 cursor-not-allowed"
                            >
                                <Zap size={24} className="mb-1"/>
                                <span className="text-[9px] font-bold">{t('xenoflora.flare')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {phase === 'GAME_OVER' && (
                <div className="text-center animate-in zoom-in">
                    <AlertTriangle size={64} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-white mb-2">{t('xenoflora.hull_breach')}</h2>
                    <p className="text-gray-400 mb-6">{t('xenoflora.failed_at', {depth: Math.floor(altitude)})}</p>
                    <Button variant="primary" onClick={() => { setHull(100); setAltitude(0); setHeat(0); setCollectedSamples([]); setPhase('ASCENT'); }}>
                        {t('xenoflora.reboot')}
                    </Button>
                </div>
            )}

            {(phase === 'DESIGN' || phase === 'ANALYSIS') && (
                <div className="w-full max-w-md space-y-6 animate-in slide-in-from-bottom duration-500">
                    <div className="bg-teal-900/20 border border-teal-500/30 p-4 rounded-xl text-left">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center text-teal-400">
                                <Wind className="mr-2" size={18} />
                                <span className="font-bold uppercase text-xs">{t('xenoflora.target_reached')}</span>
                            </div>
                            <div className="text-xs font-mono text-white bg-teal-900 px-2 py-1 rounded">
                                {t('xenoflora.samples_collected', {count: collectedSamples.length})}
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                            {collectedSamples.map((s, i) => (
                                <span key={i} className="text-[10px] bg-black/50 border border-teal-500/50 text-teal-200 px-2 py-1 rounded flex items-center">
                                    <Dna size={10} className="mr-1"/> {s.trait}
                                </span>
                            ))}
                            {collectedSamples.length === 0 && <span className="text-[10px] text-gray-500 italic">{t('xenoflora.no_samples')}</span>}
                        </div>

                        <p className="text-sm text-gray-300">
                            {t('xenoflora.design_prompt')}
                        </p>
                    </div>

                    {phase === 'ANALYSIS' && creatureData ? (
                        <div className="bg-black/60 border border-white/10 p-4 rounded-xl">
                            <div className="flex justify-center mb-4">
                                {creatureData.consistencyScore > 80 ? <GaleWhaleIcon /> : <div className="text-4xl">🧬❓</div>}
                            </div>
                            <h3 className="text-white font-bold text-lg mb-1">{t('xenoflora.simulation_result')}</h3>
                            <div className="flex items-center space-x-2 mb-3">
                                <div className="text-xs text-gray-400">{t('xenoflora.viability')}:</div>
                                <div className={`text-xs font-bold ${creatureData.consistencyScore > 80 ? 'text-green-400' : 'text-red-400'}`}>
                                    {creatureData.consistencyScore}%
                                </div>
                            </div>
                            <p className="text-xs text-gray-300 font-sans leading-relaxed border-l-2 border-teal-500 pl-2 mb-2 whitespace-pre-wrap">
                                {creatureData.biology}
                            </p>
                            <p className="text-[10px] text-teal-400 uppercase">{creatureData.feedback}</p>
                            
                            {creatureData.consistencyScore <= 80 && (
                                <Button size="sm" variant="secondary" onClick={() => { setCreatureData(null); setPhase('DESIGN'); }} className="mt-4 w-full">{t('xenoflora.retry_design')}</Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <textarea 
                                className="w-full bg-black/50 border border-teal-800 rounded-xl p-4 text-white text-sm focus:border-teal-500 focus:outline-none resize-none font-sans"
                                rows={4}
                                placeholder={t('games.xenoflora.describe_the_creatur')}
                                value={creaturePrompt}
                                onChange={e => setCreaturePrompt(e.target.value)}
                            />
                            <Button fullWidth variant="primary" onClick={handleDesign} disabled={isDesigning || !creaturePrompt}>
                                {isDesigning ? t('xenoflora.simulating') : <><PenTool size={16} className="mr-2"/> {t('xenoflora.generate')}</>}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};
