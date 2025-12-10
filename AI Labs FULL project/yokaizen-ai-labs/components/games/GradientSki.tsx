
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Mountain, Zap, AlertTriangle, Play, FastForward, TrendingDown, Database, ChevronLeft, ChevronRight, Hexagon, Skull } from 'lucide-react';
import { Scanlines, Vignette } from '../ui/Visuals';
import { audio } from '../../services/audioService';
import { Language } from '../../types';

interface GradientSkiProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

interface Obstacle {
  id: number;
  lane: number; // -1, 0, 1
  z: number; // 0 (far) to 1000 (near)
  type: 'SPIKE' | 'DATA' | 'GATE';
  hit: boolean;
}

export const GradientSki: React.FC<GradientSkiProps> = ({ onComplete, t }) => {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'OVER'>('MENU');
  const [lane, setLane] = useState(0); // -1, 0, 1
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(20);
  const [gridOffset, setGridOffset] = useState(0);
  
  // Visuals
  const [tilt, setTilt] = useState(0); // Visual banking angle
  const [fov, setFov] = useState(500); // Dynamic FOV
  
  const obstacles = useRef<Obstacle[]>([]);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef(0);

  // --- GAME LOOP ---
  useEffect(() => {
      if (gameState !== 'PLAYING') return;

      const loop = (time: number) => {
          const dt = Math.min((time - lastTimeRef.current) / 16, 2);
          lastTimeRef.current = time;

          // 1. Move Grid & Speed Logic
          setGridOffset(prev => (prev + speed * dt) % 100);
          setSpeed(s => Math.min(60, s + 0.01)); // Accelerate over time
          
          // Dynamic FOV based on speed (Warp effect)
          setFov(500 + (speed * 5));

          // 2. Move Obstacles
          const nextObstacles: Obstacle[] = [];
          obstacles.current.forEach(obs => {
              obs.z += speed * dt;
              
              // Collision
              if (!obs.hit && obs.z > 850 && obs.z < 950) {
                  if (obs.lane === lane) {
                      obs.hit = true;
                      if (obs.type === 'SPIKE') {
                          handleCrash();
                      } else if (obs.type === 'DATA') {
                          audio.playSuccess();
                          setScore(s => s + 100);
                          setSpeed(s => Math.min(60, s + 2)); // Boost
                      } else { // GATE
                          audio.playScan();
                          setScore(s => s + 50);
                      }
                  }
              }
              
              if (obs.z < 1200) nextObstacles.push(obs); // Keep until behind camera
          });
          
          obstacles.current = nextObstacles;

          // 3. Spawn
          if (Math.random() < 0.03 * (speed / 20)) {
              const types: Obstacle['type'][] = ['SPIKE', 'SPIKE', 'DATA', 'GATE'];
              obstacles.current.push({
                  id: Math.random(),
                  lane: Math.floor(Math.random() * 3) - 1,
                  z: 0,
                  type: types[Math.floor(Math.random() * types.length)],
                  hit: false
              });
          }

          setScore(s => s + 1);
          requestRef.current = requestAnimationFrame(loop);
      };
      
      lastTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, lane]); 

  const handleCrash = () => {
      audio.playError();
      audio.vibrate([100, 50, 100]);
      setGameState('OVER');
  };

  const move = (dir: -1 | 1) => {
      setLane(prev => {
          const next = Math.max(-1, Math.min(1, prev + dir));
          if (next !== prev) {
              setTilt(dir * 20); // Bank into turn
              setTimeout(() => setTilt(0), 200); // Reset
              audio.playHover();
          }
          return next;
      });
  };

  return (
    <div className="h-full flex flex-col bg-[#1a0b2e] relative overflow-hidden font-mono select-none touch-none">
        <Scanlines />
        <Vignette color="#1a0b2e" />
        
        {/* Speed Lines Effect */}
        {gameState === 'PLAYING' && speed > 40 && (
            <div className="absolute inset-0 z-20 pointer-events-none opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay animate-pulse-slow"></div>
        )}

        {/* --- SUN / HORIZON --- */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gradient-to-t from-pink-500 via-purple-600 to-indigo-900 blur-3xl opacity-60 pointer-events-none"></div>
        
        {/* Retro Grid Horizon Lines */}
        <div className="absolute top-[40%] left-0 right-0 h-px bg-pink-500/50 blur-[1px]"></div>
        <div className="absolute top-[42%] left-0 right-0 h-px bg-pink-500/40 blur-[1px]"></div>
        <div className="absolute top-[45%] left-0 right-0 h-px bg-pink-500/30 blur-[1px]"></div>

        {/* --- 3D WORLD --- */}
        <div className="flex-1 relative overflow-hidden" style={{ perspective: `${fov}px` }}>
            <div className="absolute inset-0 transform-style-3d bg-gradient-to-b from-transparent to-[#2e0249] opacity-80"></div>
            
            {/* Moving Floor */}
            <div 
                className="absolute inset-0 origin-bottom transform rotate-x-60"
                style={{
                    background: `linear-gradient(transparent 0%, rgba(236,72,153,0.3) 100%), linear-gradient(90deg, #2e0249 0%, rgba(236,72,153,0.1) 50%, #2e0249 100%)`,
                    backgroundSize: `100% 100px, 100% 100%`,
                    backgroundPosition: `0 ${gridOffset}px`
                }}
            >
                {/* Vertical Lane Dividers */}
                <div className="absolute inset-0 flex justify-center w-full h-full opacity-50">
                    <div className="w-[2px] h-full bg-pink-500 mx-24 transform -skew-x-[30deg] origin-bottom"></div>
                    <div className="w-[2px] h-full bg-pink-500 mx-24 transform skew-x-[30deg] origin-bottom"></div>
                </div>
            </div>

            {/* Obstacles */}
            {obstacles.current.map(obs => {
                const scale = 0.5 + (obs.z / 1000) * 2;
                const opacity = Math.min(1, obs.z / 800);
                const xOffset = obs.lane * (150 + (obs.z * 0.8)); 
                
                return (
                    <div 
                        key={obs.id}
                        className="absolute bottom-[10%] left-1/2 -translate-x-1/2 flex items-center justify-center transition-transform will-change-transform"
                        style={{ 
                            transform: `translateX(${xOffset}px) scale(${scale})`,
                            zIndex: Math.floor(obs.z),
                            opacity: obs.hit ? 0 : opacity,
                            marginBottom: `${obs.z * 0.05}px` 
                        }}
                    >
                        {obs.type === 'SPIKE' ? (
                            <div className="w-16 h-32 relative group">
                                <div className="absolute inset-0 bg-red-600 clip-path-spike transform skew-x-12 shadow-[0_0_20px_red]"></div>
                                <div className="absolute inset-0 bg-red-400 clip-path-spike transform -skew-x-12 opacity-50"></div>
                                <Skull className="absolute top-8 left-1/2 -translate-x-1/2 text-black opacity-50" size={16} />
                            </div>
                        ) : obs.type === 'DATA' ? (
                            <div className="w-12 h-12 bg-cyan-400 rotate-45 border-4 border-white shadow-[0_0_30px_cyan] flex items-center justify-center animate-spin-slow">
                                <Database size={24} className="text-black -rotate-45" />
                            </div>
                        ) : (
                            <div className="w-40 h-24 border-x-4 border-t-4 border-green-400 rounded-t-xl flex justify-center shadow-[0_0_30px_lime]">
                                <div className="h-full w-full bg-green-500/10 animate-pulse"></div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Player */}
            {gameState === 'PLAYING' && (
                <div 
                    className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-24 h-12 z-50 transition-all duration-150 ease-out"
                    style={{ 
                        transform: `translateX(${lane * 180}px) rotateZ(${tilt}deg) scale(${1 + (speed/100)})` 
                    }}
                >
                    {/* Hover Board */}
                    <div className="w-full h-full bg-gray-200 rounded-full shadow-[0_10px_30px_cyan] border-b-8 border-cyan-500 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-300 via-white to-gray-300"></div>
                        {/* Engine Glow */}
                        <div className="absolute -bottom-4 left-2 w-4 h-16 bg-cyan-400 blur-md animate-pulse"></div>
                        <div className="absolute -bottom-4 right-2 w-4 h-16 bg-cyan-400 blur-md animate-pulse"></div>
                        
                        {/* Speed Lines on Board */}
                        <div className="absolute top-0 w-full h-full bg-[linear-gradient(90deg,transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:4px_100%]"></div>
                    </div>
                </div>
            )}
        </div>

        {/* --- HUD --- */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between z-30 bg-gradient-to-b from-black/80 to-transparent">
            <div>
                <div className="text-[10px] text-pink-500 font-bold uppercase italic tracking-widest mb-1">{t('ui.score')}</div>
                <div className="text-4xl font-black text-white italic drop-shadow-[2px_2px_0px_#ec4899]">{score.toLocaleString()}</div>
            </div>
            <div className="text-right">
                <div className="text-[10px] text-cyan-500 font-bold uppercase italic tracking-widest mb-1">{t('ski.velocity')}</div>
                <div className="text-4xl font-black text-white italic drop-shadow-[2px_2px_0px_#06b6d4]">
                    {speed.toFixed(0)} <span className="text-sm not-italic text-gray-400">EPOCHS/S</span>
                </div>
                {speed > 50 && <div className="text-[10px] text-red-500 font-bold animate-pulse">MAX VELOCITY</div>}
            </div>
        </div>

        {/* --- CONTROLS --- */}
        {gameState === 'PLAYING' && (
            <div className="absolute inset-0 z-40 flex">
                <div 
                    className="flex-1 active:bg-cyan-500/10 transition-colors flex items-center justify-start pl-8 opacity-50 hover:opacity-100 group" 
                    onPointerDown={() => move(-1)}
                >
                    <ChevronLeft size={80} className="text-white/20 group-active:text-cyan-400 transition-colors" />
                </div>
                <div 
                    className="flex-1 active:bg-cyan-500/10 transition-colors flex items-center justify-end pr-8 opacity-50 hover:opacity-100 group" 
                    onPointerDown={() => move(1)}
                >
                    <ChevronRight size={80} className="text-white/20 group-active:text-cyan-400 transition-colors" />
                </div>
            </div>
        )}

        {/* --- MENUS --- */}
        {gameState === 'MENU' && (
            <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in backdrop-blur-sm">
                <TrendingDown size={80} className="text-pink-500 mb-6 animate-bounce" />
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-pink-500 mb-2 italic tracking-tighter transform -skew-x-12 filter drop-shadow-[0_0_25px_rgba(236,72,153,0.5)]">
                    {t('ski.title')}
                </h1>
                <p className="text-gray-300 mb-10 font-mono text-sm max-w-xs border-l-2 border-pink-500 pl-4 text-left">
                    {t('ski.subtitle')}<br/>
                    <span className="text-cyan-400">AVOID</span> Spikes (Loss Function)<br/>
                    <span className="text-pink-400">COLLECT</span> Data (Gradients)
                </p>
                <Button size="lg" variant="primary" onClick={() => setGameState('PLAYING')} className="shadow-[0_0_40px_#06b6d4] h-16 w-64 text-xl border-cyan-400 text-cyan-100 font-bold tracking-widest">
                    {t('ski.jack_in')}
                </Button>
            </div>
        )}

        {gameState === 'OVER' && (
            <div className="absolute inset-0 bg-red-950/95 z-50 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in border-y-[20px] border-red-900">
                <AlertTriangle size={80} className="text-white mb-6 animate-shake" />
                <h2 className="text-5xl font-black text-white italic mb-4">{t('ski.crashed')}</h2>
                <div className="bg-black/50 p-6 rounded-xl border border-red-500 mb-8 w-full max-w-xs">
                    <div className="text-xs text-red-400 uppercase font-bold mb-1">LOCAL MINIMUM REACHED</div>
                    <div className="text-4xl font-mono text-white">{score}</div>
                </div>
                <div className="space-y-4 w-full max-w-xs">
                    <Button fullWidth variant="primary" onClick={() => { setGameState('PLAYING'); setScore(0); setSpeed(20); obstacles.current=[]; }} className="bg-white text-red-900 hover:bg-gray-200">{t('ski.retry')}</Button>
                    <Button fullWidth variant="ghost" onClick={() => onComplete(score > 1000 ? 100 : 50)} className="text-red-300 hover:text-white">{t('ski.lobby')}</Button>
                </div>
            </div>
        )}

        <style>{`
            .clip-path-spike { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }
        `}</style>
    </div>
  );
};
