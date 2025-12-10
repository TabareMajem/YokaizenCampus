
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Shield, Zap, AlertOctagon, CheckCircle2, Skull, Rocket, Activity, Crosshair, ShieldAlert } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Language } from '../../types';

interface DefenseStrategistProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

interface Threat {
    id: number;
    x: number; // angle 0-180
    y: number; // distance 100 -> 0
    type: 'DRONE' | 'ARMORED' | 'FAST' | 'BIRD';
    hp: number;
    scanned: boolean;
    destroyed: boolean;
}

export const DefenseStrategist: React.FC<DefenseStrategistProps> = ({ onComplete, t }) => {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [energy, setEnergy] = useState(100);
  const [integrity, setIntegrity] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [activeSector, setActiveSector] = useState<number | null>(null);
  const [empCooldown, setEmpCooldown] = useState(0);
  const [particles, setParticles] = useState<{id: number, x: number, y: number, color: string}[]>([]);

  // Refs
  const frameRef = useRef(0);

  useEffect(() => {
      if (gameOver) return;

      const spawnInterval = setInterval(() => {
          const roll = Math.random();
          let type: Threat['type'] = 'DRONE';
          let hp = 1;
          
          if (roll > 0.85) { type = 'ARMORED'; hp = 2; }
          else if (roll > 0.7) { type = 'FAST'; hp = 1; }
          else if (roll > 0.6) { type = 'BIRD'; hp = 1; } // Decoy

          const newThreat: Threat = {
              id: Date.now(),
              x: Math.random() * 180,
              y: 100,
              type,
              hp,
              scanned: false,
              destroyed: false
          };
          setThreats(prev => [...prev, newThreat]);
      }, 1200);

      const loop = () => {
          setEnergy(e => Math.min(100, e + 0.2)); 
          if (empCooldown > 0) setEmpCooldown(c => Math.max(0, c - 1));

          setThreats(prev => prev.map(t => {
              if (t.destroyed) return t;
              
              const speed = t.type === 'FAST' ? 0.8 : t.type === 'ARMORED' ? 0.3 : 0.5;
              const newY = t.y - speed;
              
              if (newY <= 0) {
                  // Impact
                  if (t.type !== 'BIRD') {
                      const sector = Math.floor(t.x / 60);
                      if (activeSector === sector && energy > 5) {
                          setEnergy(e => e - 5);
                          spawnExplosion(t.x, 0, '#00FFFF');
                          audio.playSuccess();
                          return { ...t, destroyed: true };
                      } else {
                          setIntegrity(i => Math.max(0, i - (t.type === 'ARMORED' ? 25 : 15)));
                          audio.playError();
                          return { ...t, destroyed: true };
                      }
                  }
                  return { ...t, destroyed: true };
              }
              return { ...t, y: newY };
          }).filter(t => t.y > -5));

          if (integrity <= 0) setGameOver(true);
          frameRef.current = requestAnimationFrame(loop);
      };

      frameRef.current = requestAnimationFrame(loop);
      return () => {
          clearInterval(spawnInterval);
          cancelAnimationFrame(frameRef.current);
      };
  }, [gameOver, activeSector, energy, integrity, empCooldown]);

  const spawnExplosion = (xAngle: number, yPos: number, color: string) => {
      // Particles placeholder
  };

  const handleTapThreat = (id: number) => {
      setThreats(prev => prev.map(t => {
          if (t.id === id && !t.destroyed) {
              if (!t.scanned) {
                  audio.playScan();
                  return { ...t, scanned: true };
              }
              if (energy >= 10 && t.type !== 'BIRD') {
                  setEnergy(e => e - 10);
                  audio.playClick();
                  const newHp = t.hp - 1;
                  return { ...t, hp: newHp, destroyed: newHp <= 0 };
              }
          }
          return t;
      }));
  };

  const fireEMP = () => {
      if (empCooldown > 0 || energy < 50) return;
      setEnergy(e => e - 50);
      setEmpCooldown(300);
      audio.playGlitch();
      
      setThreats(prev => prev.map(t => ({ ...t, destroyed: true })));
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden select-none touch-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[length:40px_40px]"></div>

        {/* HUD */}
        <div className="absolute top-0 w-full p-4 pl-16 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent">
            <div>
                <div className="flex items-center text-cyan-400 font-bold text-xs mb-1"><Shield size={14} className="mr-1"/> {t('defense.integrity')}</div>
                <div className="w-32 h-3 bg-gray-800 rounded-full border border-gray-600 overflow-hidden">
                    <div className={`h-full transition-all ${integrity < 30 ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'}`} style={{ width: `${integrity}%` }}></div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-xs text-yellow-400 font-bold mb-1 flex items-center justify-end"><Zap size={14} className="mr-1"/> {t('defense.power')}</div>
                <div className="text-xl font-mono font-black text-white">{Math.floor(energy)}%</div>
            </div>
        </div>

        {/* GAME AREA */}
        <div className="flex-1 relative flex items-end justify-center pb-20 overflow-hidden">
            <div className="absolute bottom-0 w-[120%] h-[60%] border-t-2 border-cyan-500/50 rounded-t-[100%] bg-cyan-900/10 backdrop-blur-sm pointer-events-none">
                {activeSector !== null && (
                    <div 
                        className="absolute bottom-0 h-full w-1/3 bg-cyan-400/20 transition-all duration-100 origin-bottom"
                        style={{ 
                            left: activeSector === 0 ? '0%' : activeSector === 1 ? '33.3%' : '66.6%',
                            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' 
                        }}
                    ></div>
                )}
            </div>

            {threats.map(t => {
                if (t.destroyed) return null;
                const left = (t.x / 180) * 100;
                
                return (
                    <button
                        key={t.id}
                        onPointerDown={() => handleTapThreat(t.id)}
                        className={`absolute w-10 h-10 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-100 z-10 ${t.scanned ? '' : 'animate-pulse'}`}
                        style={{ left: `${left}%`, bottom: `${t.y}%` }}
                    >
                        {t.scanned ? (
                            t.type === 'BIRD' ? <span className="text-xs text-green-500">BIO</span> :
                            t.type === 'ARMORED' ? <ShieldAlert className="text-orange-500 drop-shadow-[0_0_10px_orange]" size={28} /> :
                            t.type === 'FAST' ? <Rocket className="text-red-400 drop-shadow-[0_0_10px_red]" size={24} /> :
                            <AlertOctagon className="text-red-500 drop-shadow-[0_0_10px_red]" size={24} />
                        ) : (
                            <Crosshair size={20} className="text-white opacity-80" />
                        )}
                        {t.hp > 1 && <div className="absolute -top-2 right-0 bg-red-600 text-white text-[8px] px-1 rounded">{t.hp}</div>}
                    </button>
                );
            })}
        </div>

        {/* CONTROLS */}
        <div className="h-32 bg-gray-900 grid grid-cols-3 gap-1 p-1 z-30 border-t border-cyan-900">
            {[0, 1, 2].map(i => (
                <button 
                    key={i}
                    className={`relative rounded flex flex-col items-center justify-center border transition-all active:scale-95 ${
                        activeSector === i ? 'bg-cyan-900/50 border-cyan-400 text-cyan-300' : 'bg-black border-gray-800 text-gray-500'
                    }`}
                    onPointerDown={() => setActiveSector(i)}
                >
                    <div className="text-lg font-black">SEC {String.fromCharCode(65+i)}</div>
                    <div className="text-[9px]">{t('defense.shield')}</div>
                </button>
            ))}
        </div>

        <div className="absolute bottom-36 right-4 z-40">
            <button 
                onClick={fireEMP}
                disabled={empCooldown > 0 || energy < 50}
                className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center shadow-lg transition-all ${
                    empCooldown > 0 || energy < 50 
                    ? 'bg-gray-800 border-gray-600 text-gray-500 opacity-50' 
                    : 'bg-yellow-500 border-white text-black animate-pulse active:scale-90'
                }`}
            >
                <Activity size={24} />
                <span className="text-[8px] font-black">EMP</span>
            </button>
        </div>

        {gameOver && (
            <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in zoom-in">
                <Skull size={64} className="text-red-500 mb-4" />
                <h2 className="text-3xl font-black text-white tracking-widest">{t('defense.failed')}</h2>
                <Button variant="secondary" onClick={() => window.location.reload()} className="mt-8">{t('defense.reboot')}</Button>
            </div>
        )}
    </div>
  );
};
