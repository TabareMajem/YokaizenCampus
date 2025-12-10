
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { audio } from '../../services/audioService';
import { Scan, User, Activity, Info, CheckCircle2, AlertTriangle, Volume2, Zap, Eye, ShieldAlert, Radio, Server, Wine, Sprout, Fingerprint, Thermometer, Clock, Heart, Crosshair, Search, Lightbulb, Blinds } from 'lucide-react';
import { Vignette, Scanlines } from '../ui/Visuals';
import { Language } from '../../types';

interface DoppelgangerProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

type EntityType = 'GUEST' | 'PROP';
type GuestType = 'HUMAN' | 'AI';
type PropType = 'SERVER' | 'PLANT' | 'DRINK' | 'CURTAIN' | 'LIGHT';

interface Entity {
  id: string;
  type: EntityType;
  gridIndex: number; 
  guestType?: GuestType;
  avatarSeed?: string;
  reactionState?: 'IDLE' | 'STARTLED' | 'LOOPING' | 'GLITCHING' | 'NERVOUS';
  biometrics?: {
      heartRate: number | 'ERROR'; 
      temp: string; 
      dermis: string; 
  };
  propType?: PropType;
  isActive?: boolean;
}

interface Drone {
  id: number;
  position: number;
}

export const Doppelganger: React.FC<DoppelgangerProps> = ({ onComplete, t }) => {
  const [phase, setPhase] = useState<'BRIEFING' | 'INFILTRATION' | 'RESULT'>('BRIEFING');
  const [grid, setGrid] = useState<Entity[]>([]);
  const [drones, setDrones] = useState<Drone[]>([{ id: 1, position: 0 }]);
  const [threatLevel, setThreatLevel] = useState(0);
  const [scanningTargetId, setScanningTargetId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0); 
  const [revealedIntel, setRevealedIntel] = useState<Record<string, number>>({}); 
  const [result, setResult] = useState<{success: boolean, msg: string, score: number} | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  
  const loopRef = useRef<number | null>(null);

  useEffect(() => {
      const newGrid: Entity[] = [];
      const totalCells = 16;
      const humanIdx = Math.floor(Math.random() * totalCells);
      const propIndices = new Set<number>();
      while(propIndices.size < 6) { 
          let idx = Math.floor(Math.random() * totalCells);
          if (idx !== humanIdx) propIndices.add(idx);
      }

      for (let i = 0; i < totalCells; i++) {
          if (propIndices.has(i)) {
              const pTypes: PropType[] = ['SERVER', 'PLANT', 'DRINK', 'CURTAIN', 'LIGHT'];
              const type = pTypes[Math.floor(Math.random() * pTypes.length)];
              newGrid.push({ id: `prop-${i}`, type: 'PROP', gridIndex: i, propType: type, isActive: false });
          } else {
              const isHuman = i === humanIdx;
              newGrid.push({
                  id: `guest-${i}`, type: 'GUEST', gridIndex: i, guestType: isHuman ? 'HUMAN' : 'AI', avatarSeed: `Agent${i+100}`, reactionState: 'IDLE',
                  biometrics: isHuman ? { heartRate: 80 + Math.floor(Math.random() * 30), temp: '37.2°C', dermis: 'Organic' } : { heartRate: 0, temp: '22.0°C', dermis: 'Synthetic' }
              });
          }
      }
      setGrid(newGrid);
      return () => { if (loopRef.current) clearInterval(loopRef.current); audio.stopAmbience(); };
  }, []);

  useEffect(() => { if (phase === 'INFILTRATION') audio.startAmbience('HORROR'); else audio.stopAmbience(); }, [phase]);

  useEffect(() => {
      if (phase !== 'INFILTRATION') return;
      // @ts-ignore
      loopRef.current = setInterval(() => {
          setDrones(prev => prev.map(d => {
              if (Math.random() > 0.9) {
                  const row = Math.floor(d.position / 4); const col = d.position % 4; const moves = [];
                  if (row > 0) moves.push(d.position - 4); if (row < 3) moves.push(d.position + 4);
                  if (col > 0) moves.push(d.position - 1); if (col < 3) moves.push(d.position + 1);
                  return { ...d, position: moves[Math.floor(Math.random() * moves.length)] };
              }
              return d;
          }));
          setThreatLevel(t => Math.max(0, t - 0.2));
          setGrid(prev => prev.map(e => {
              if (e.type === 'PROP' && e.isActive && Math.random() > 0.92) return { ...e, isActive: false };
              if (e.type === 'GUEST' && e.guestType === 'HUMAN') {
                  if (hoveredEntityId === e.id && Math.random() > 0.8) return { ...e, reactionState: 'NERVOUS' };
                  if (e.reactionState === 'IDLE' && Math.random() > 0.98) return { ...e, reactionState: 'NERVOUS' };
              }
              if (e.type === 'GUEST' && e.guestType === 'AI') {
                  if (e.reactionState === 'IDLE' && Math.random() > 0.99) return { ...e, reactionState: 'GLITCHING' };
              }
              if (e.reactionState !== 'IDLE' && Math.random() > 0.85) return { ...e, reactionState: 'IDLE' };
              return e;
          }));
      }, 100);
      return () => clearInterval(loopRef.current!);
  }, [phase, hoveredEntityId]);

  const handlePropInteract = (prop: Entity) => {
      if (prop.type !== 'PROP') return;
      audio.playClick(); 
      const newGrid = [...grid]; const propIdx = newGrid.findIndex(e => e.id === prop.id); newGrid[propIdx].isActive = true;
      if (['SERVER', 'DRINK', 'PLANT'].includes(prop.propType || '')) {
          const pRow = Math.floor(prop.gridIndex / 4); const pCol = prop.gridIndex % 4;
          newGrid.forEach(e => {
              if (e.type === 'GUEST') {
                  const eRow = Math.floor(e.gridIndex / 4); const eCol = e.gridIndex % 4; const dist = Math.abs(pRow - eRow) + Math.abs(pCol - eCol);
                  if (dist <= 1.5) { 
                      if (e.guestType === 'HUMAN') e.reactionState = 'STARTLED';
                      else if (Math.random() > 0.7) e.reactionState = 'GLITCHING';
                  }
              }
          });
      }
      setGrid(newGrid);
  };

  useEffect(() => {
      if (!scanningTargetId || phase !== 'INFILTRATION') return;
      const interval = setInterval(() => {
          const target = grid.find(g => g.id === scanningTargetId); if (!target) return;
          const isObserved = drones.some(d => {
              const dRow = Math.floor(d.position / 4); const dCol = d.position % 4; const tRow = Math.floor(target.gridIndex / 4); const tCol = target.gridIndex % 4;
              return Math.abs(dRow - tRow) <= 1 && Math.abs(dCol - tCol) <= 1;
          });
          if (isObserved) { setThreatLevel(t => Math.min(100, t + 4)); audio.playError(); }
          setScanProgress(p => {
              const next = Math.min(100, p + 1.5); const currentLvl = revealedIntel[scanningTargetId] || 0;
              if (next > 33 && currentLvl < 1) { setRevealedIntel(prev => ({ ...prev, [scanningTargetId]: 1 })); audio.playScan(); }
              else if (next > 66 && currentLvl < 2) { setRevealedIntel(prev => ({ ...prev, [scanningTargetId]: 2 })); audio.playScan(); }
              else if (next > 99 && currentLvl < 3) { setRevealedIntel(prev => ({ ...prev, [scanningTargetId]: 3 })); audio.playScan(); }
              return next;
          });
      }, 50);
      return () => clearInterval(interval);
  }, [scanningTargetId, drones, grid, phase, revealedIntel]);

  useEffect(() => { if (threatLevel >= 100) { setPhase('RESULT'); setResult({ success: false, msg: t('doppel.failed'), score: 0 }); onComplete(0); } }, [threatLevel]);

  const handleExtract = () => {
      if (!scanningTargetId) return;
      const target = grid.find(g => g.id === scanningTargetId); if (!target || target.type !== 'GUEST') return;
      const success = target.guestType === 'HUMAN'; const score = success ? 100 : 0;
      if(success) audio.playSuccess(); else audio.playError();
      setResult({ success, msg: success ? t('doppel.secured') : "ERROR: SYNTHETIC DECOY DESTROYED.", score });
      setPhase('RESULT'); onComplete(score);
  };

  const getPropVisual = (entity: Entity) => {
      const { propType, isActive } = entity;
      switch(propType) {
          case 'SERVER': return <Server className={`text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] ${isActive ? 'animate-bounce' : ''}`} />;
          case 'DRINK': return <Wine className={`text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)] ${isActive ? 'animate-spin-slow' : ''}`} />;
          case 'PLANT': return <Sprout className={`text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)] ${isActive ? 'animate-shake' : ''}`} />;
          case 'CURTAIN': return <div className={`w-full h-full relative overflow-hidden rounded-lg ${isActive ? 'skew-x-12 scale-x-90' : ''} transition-transform duration-700 ease-out`}><div className="absolute inset-0 bg-red-950 border-x-2 border-red-900"></div><Blinds className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-800/50 w-8 h-8" /></div>;
          case 'LIGHT': return <div className="relative flex flex-col items-center"><div className="w-1 h-4 bg-amber-900"></div><Lightbulb className={`text-amber-200 ${isActive ? 'opacity-50' : 'opacity-100'} transition-opacity duration-100`} size={20} /><div className={`absolute top-full left-1/2 -translate-x-1/2 w-16 h-16 bg-amber-500/20 blur-xl rounded-full pointer-events-none ${isActive ? 'animate-ping' : 'animate-pulse'}`}></div></div>;
          default: return <Radio />;
      }
  };

  return (
    <div className="h-full flex flex-col bg-void relative overflow-hidden font-mono select-none">
        <Scanlines />
        <Vignette color="#110000" />
        <div className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-300 bg-red-900/20 mix-blend-overlay" style={{ opacity: threatLevel / 100 }}></div>

        <div className="p-3 bg-black/90 border-b border-white/10 flex justify-between items-center z-30 backdrop-blur-md">
            <div className="flex items-center text-red-500 font-bold text-xs tracking-widest"><ShieldAlert size={14} className="mr-2 animate-pulse"/> THREAT: {Math.round(threatLevel)}%</div>
            <div className="text-[10px] text-cyan-500 font-mono">GALA_HALL_B // AUDIO_SENSORS_ACTIVE</div>
        </div>

        {phase === 'INFILTRATION' && (
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                <div className="grid grid-cols-4 gap-2 w-full max-w-sm aspect-square p-4 relative z-10">
                    {grid.map(entity => {
                        const isDroneNear = drones.some(d => { const dr = Math.floor(d.position / 4); const dc = d.position % 4; const er = Math.floor(entity.gridIndex / 4); const ec = entity.gridIndex % 4; return Math.abs(dr - er) <= 1 && Math.abs(dc - ec) <= 1; });
                        const isScanning = scanningTargetId === entity.id;
                        return (
                            <div key={entity.id} className={`relative rounded-lg border transition-all duration-200 flex items-center justify-center group overflow-hidden ${entity.type === 'PROP' ? 'bg-gray-900/80 border-gray-700 cursor-pointer hover:border-white' : 'cursor-crosshair'} ${isScanning ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] z-20' : 'border-gray-800'} ${isDroneNear ? 'bg-red-900/10' : ''}`} onMouseDown={() => { if(entity.type === 'GUEST') { setScanningTargetId(entity.id); audio.playScan(); } }} onMouseUp={() => setScanningTargetId(null)} onTouchStart={() => { setHoveredEntityId(entity.id); if(entity.type === 'GUEST') { setScanningTargetId(entity.id); audio.playScan(); } }} onTouchEnd={() => setScanningTargetId(null)} onMouseEnter={() => { setHoveredEntityId(entity.id); if(entity.type === 'PROP' && entity.propType === 'CURTAIN') handlePropInteract(entity); }} onClick={() => entity.type === 'PROP' && handlePropInteract(entity)}>
                                {isDroneNear && <div className="absolute inset-0 border-2 border-red-500/20 animate-pulse pointer-events-none"></div>}
                                {entity.type === 'PROP' && <div className="w-full h-full flex items-center justify-center">{getPropVisual(entity)}</div>}
                                {entity.type === 'GUEST' && <div className="relative"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${entity.avatarSeed}`} className={`w-10 h-10 rounded-full transition-all duration-300 ${entity.reactionState === 'NERVOUS' ? 'animate-shake' : ''} ${entity.reactionState === 'STARTLED' ? 'scale-110 -translate-y-1' : ''} ${entity.reactionState === 'GLITCHING' ? 'opacity-70 brightness-150' : ''} ${entity.guestType === 'HUMAN' && entity.reactionState === 'IDLE' ? 'animate-pulse' : ''}`} style={{ filter: entity.reactionState === 'GLITCHING' ? 'hue-rotate(90deg) contrast(150%)' : 'none' }} />{isScanning && <div className="absolute inset-[-10px] border border-cyan-400 rounded-full animate-spin-slow border-dashed"></div>}</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {phase === 'BRIEFING' && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center">
                <Crosshair size={64} className="text-cyan-500 mb-6 animate-spin-slow" />
                <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">DOPPELGÄNGER</h1>
                <Button size="lg" variant="primary" onClick={() => { audio.init(); setPhase('INFILTRATION'); }}>{t('doppel.start')}</Button>
            </div>
        )}

        {phase === 'RESULT' && result && (
            <div className={`absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in ${result.success ? 'border-4 border-green-500' : 'border-4 border-red-500'}`}>
                <h2 className="text-3xl font-black text-white mb-4">{result.success ? t('doppel.secured') : t('doppel.failed')}</h2>
                <p className="text-sm text-gray-300 mb-8 font-mono">{result.msg}</p>
                <Button variant="glass" onClick={() => window.location.reload()}>{t('doppel.reboot')}</Button>
            </div>
        )}

        {phase === 'INFILTRATION' && (
            <div className="h-40 bg-gray-900 border-t border-cyan-500/30 p-4 z-40 relative shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex h-full space-x-4">
                    <div className="flex-1 border-r border-white/10 pr-4 flex flex-col justify-center">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('doppel.target_lock')}</div>
                        {hoveredEntityId ? <div className="text-white font-mono text-sm flex items-center"><User size={16} className="text-cyan-500 mr-2" />{hoveredEntityId}</div> : <div className="text-gray-600 font-mono text-xs italic">{t('doppel.no_target')}</div>}
                        <div className="mt-3 w-full h-2 bg-black rounded-full border border-gray-700 overflow-hidden relative"><div className="h-full bg-cyan-500 transition-all duration-100 ease-linear" style={{ width: `${scanProgress}%` }}></div></div>
                    </div>
                    <div className="flex-[2] flex flex-col justify-center space-y-2 font-mono text-xs">
                        <div className="flex justify-between items-center p-1 border-b border-white/5"><span className="text-gray-500 flex items-center"><Activity size={10} className="mr-1"/> {t('doppel.heart_rate')}</span><span className="text-white">{revealedIntel[hoveredEntityId || ''] >= 1 ? grid.find(g => g.id === hoveredEntityId)?.biometrics?.heartRate : '---'}</span></div>
                    </div>
                    <div className="flex items-center justify-center w-24">
                        <button onClick={handleExtract} disabled={!scanningTargetId || scanProgress < 20} className={`w-full h-full border-2 rounded-lg flex flex-col items-center justify-center transition-all duration-200 ${scanningTargetId && scanProgress > 20 ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-gray-700 bg-black/50 text-gray-600'}`}>
                            <Zap size={24} className="mb-1" /><span className="text-[10px] font-bold">{t('doppel.extract')}</span>
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
