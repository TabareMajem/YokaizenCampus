
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Radar, ShieldCheck, Ban, Zap, AlertTriangle, Crosshair, Hexagon } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Difficulty, Language } from '../../types';
import { Scanlines } from '../ui/Visuals';

interface OODSentinelProps {
  onComplete: (score: number) => void;
  difficulty?: Difficulty;
  t: (key: string) => string;
  language?: Language;
}

interface Packet {
    id: number;
    z: number; // Depth (0 to 1000)
    x: number; // Horizontal offset (-1 to 1)
    rot: number; // Rotation
    type: 'SAFE' | 'ANOMALY';
    shape: 'CUBE' | 'PYRAMID' | 'ICOSAHEDRON';
    color: string;
    processed: boolean;
}

export const OODSentinel: React.FC<OODSentinelProps> = ({ onComplete, difficulty = 'Pro', t }) => {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'GOOD'|'BAD', text: string} | null>(null);
  
  // Refs
  const speedRef = useRef(difficulty === 'Rookie' ? 15 : difficulty === 'Elite' ? 35 : 25);
  const requestRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);

  const spawnPacket = () => {
      const isAnomaly = Math.random() > 0.6; // High anomaly rate
      const shapes: Packet['shape'][] = ['CUBE', 'PYRAMID', 'ICOSAHEDRON'];
      
      const newPacket: Packet = {
          id: Date.now() + Math.random(),
          z: 2000, // Start very far
          x: (Math.random() - 0.5) * 1.5, // Spread
          rot: Math.random() * 360,
          type: isAnomaly ? 'ANOMALY' : 'SAFE',
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          color: isAnomaly ? '#ef4444' : '#3b82f6', 
          processed: false
      };
      
      setPackets(prev => [...prev, newPacket]);
  };

  useEffect(() => {
      if (gameOver) return;

      let lastTime = performance.now();

      const loop = (time: number) => {
          const dt = (time - lastTime) / 16;
          lastTime = time;

          // Spawn Logic
          if (time - lastSpawnRef.current > (12000 / speedRef.current)) {
              spawnPacket();
              lastSpawnRef.current = time;
              speedRef.current += 0.05; // Accelerate
          }

          setPackets(prev => {
              const next = prev.map(p => ({
                  ...p,
                  z: p.z - (speedRef.current * dt),
                  rot: p.rot + (5 * dt)
              }));

              // Missed packets check
              const missed = next.filter(p => p.z <= 0 && !p.processed);
              if (missed.length > 0) {
                  missed.forEach(m => {
                      if (m.type === 'ANOMALY') {
                          setHealth(h => Math.max(0, h - 20));
                          setFeedback({ type: 'BAD', text: t('ood.breached') });
                          audio.playError();
                      }
                  });
                  if (health <= 0) setGameOver(true);
              }

              return next.filter(p => p.z > 0 || p.processed);
          });

          requestRef.current = requestAnimationFrame(loop);
      };

      requestRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(requestRef.current);
  }, [gameOver, health]);

  const handleAction = (action: 'ACCEPT' | 'REJECT') => {
      // Find closest packet
      const sorted = [...packets].sort((a, b) => a.z - b.z);
      const target = sorted[0]; // Closest

      if (!target || target.z > 600) return; // Too far to act

      let success = false;
      if (action === 'ACCEPT') {
          if (target.type === 'SAFE') success = true;
      } else {
          if (target.type === 'ANOMALY') success = true;
      }

      if (success) {
          setScore(s => s + 10);
          audio.playSuccess();
          setFeedback({ type: 'GOOD', text: action === 'ACCEPT' ? t('ood.verified') : t('ood.block') });
          setPackets(prev => prev.filter(p => p.id !== target.id)); // Instantly remove
          
          if (score >= 200) {
              setGameOver(true);
              onComplete(100);
          }
      } else {
          setHealth(h => Math.max(0, h - 15));
          audio.playError();
          setFeedback({ type: 'BAD', text: t('ood.error') });
          if (health <= 15) setGameOver(true);
      }
      
      setTimeout(() => setFeedback(null), 500);
  };

  // Keyboard Controls
  useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
          if (e.key === 'ArrowLeft' || e.key === 'a') handleAction('ACCEPT');
          if (e.key === 'ArrowRight' || e.key === 'd') handleAction('REJECT');
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
  }, [packets, health, score]);

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden font-mono select-none">
        <Scanlines />
        
        {/* --- HUD --- */}
        <div className="absolute top-4 left-4 z-20 flex space-x-4">
            <div className="bg-black/60 p-2 rounded border border-cyan-500/50 backdrop-blur">
                <div className="text-[10px] text-cyan-400 font-bold uppercase mb-1">{t('ood.throughput')}</div>
                <div className="text-xl font-black text-white font-mono">{score} TB</div>
            </div>
        </div>

        <div className="absolute top-4 right-4 z-20 w-48">
            <div className="flex justify-between text-[10px] text-red-400 font-bold uppercase mb-1">
                <span>{t('ood.firewall')}</span>
                <span>{health}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                <div 
                    className={`h-full transition-all duration-200 ${health < 30 ? 'bg-red-600 animate-pulse' : 'bg-green-500'}`} 
                    style={{ width: `${health}%` }}
                ></div>
            </div>
        </div>

        {feedback && (
            <div className={`absolute top-1/3 left-1/2 -translate-x-1/2 z-30 text-3xl font-black tracking-widest animate-bounce drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${feedback.type === 'BAD' ? 'text-red-500' : 'text-green-400'}`}>
                {feedback.text}
            </div>
        )}

        {/* --- 3D VIEWPORT --- */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-gray-900 perspective-[600px]">
            {/* Speed Lines / Tunnel Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_10%,#000_100%)] z-10 pointer-events-none"></div>
            <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,255,255,0.1)_10deg,transparent_20deg)] animate-spin-slow opacity-30"></div>

            {/* Target Reticle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/20 rounded-full flex items-center justify-center pointer-events-none z-0">
                <Crosshair size={24} className="text-white/30" />
            </div>

            {/* Packets */}
            {packets.map(p => {
                // Perspective Projection
                // Z goes from 2000 (far) to 0 (near)
                const scale = 2000 / (p.z + 200); 
                const opacity = Math.min(1, (2000 - p.z) / 500);
                
                return (
                    <div 
                        key={p.id}
                        className="absolute flex items-center justify-center transition-transform will-change-transform"
                        style={{
                            transform: `translate3d(${p.x * 300}px, 0px, 0) scale(${scale})`,
                            zIndex: Math.floor(2000 - p.z),
                            opacity: opacity
                        }}
                    >
                        <div 
                            className={`relative flex items-center justify-center ${p.type === 'ANOMALY' ? 'animate-shake' : 'animate-float'}`}
                            style={{ transform: `rotate(${p.rot}deg)` }}
                        >
                            {/* Shape */}
                            <div 
                                className={`w-32 h-32 border-4 ${p.type === 'ANOMALY' ? 'border-red-500 bg-red-900/40 shadow-[0_0_50px_red]' : 'border-blue-500 bg-blue-900/40 shadow-[0_0_50px_blue]'}`}
                                style={{ clipPath: p.shape === 'PYRAMID' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : p.shape === 'ICOSAHEDRON' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : 'none' }}
                            ></div>
                            {/* Core */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                {p.type === 'ANOMALY' ? <AlertTriangle size={48} className="text-white"/> : <Hexagon size={48} className="text-white"/>}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* --- CONTROLS --- */}
        <div className="h-40 bg-black border-t border-gray-800 grid grid-cols-2 divide-x divide-gray-800 z-20">
            <button 
                className="flex flex-col items-center justify-center active:bg-blue-900/50 transition-colors group relative overflow-hidden"
                onPointerDown={() => handleAction('ACCEPT')}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
                <ShieldCheck size={48} className="text-blue-500 mb-2 group-hover:scale-110 transition-transform drop-shadow-[0_0_15px_blue]" />
                <span className="text-blue-400 font-black text-2xl tracking-tighter">{t('ood.allow')}</span>
                <span className="text-[10px] text-gray-500 font-bold mt-1">{t('ood.safe_data')}</span>
            </button>
            <button 
                className="flex flex-col items-center justify-center active:bg-red-900/50 transition-colors group relative overflow-hidden"
                onPointerDown={() => handleAction('REJECT')}
            >
                <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent"></div>
                <Ban size={48} className="text-red-500 mb-2 group-hover:scale-110 transition-transform drop-shadow-[0_0_15px_red]" />
                <span className="text-red-400 font-black text-2xl tracking-tighter">{t('ood.block')}</span>
                <span className="text-[10px] text-gray-500 font-bold mt-1">{t('ood.anomaly')}</span>
            </button>
        </div>

        {gameOver && (
            <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-in zoom-in p-8 text-center">
                {score >= 200 ? (
                    <>
                        <h2 className="text-5xl font-black text-green-500 mb-4 tracking-tighter">{t('ood.secure')}</h2>
                        <div className="text-white text-xl font-mono mb-8">{t('ood.stream_integrity')}</div>
                        <Button onClick={() => onComplete(100)} variant="primary" size="lg" className="shadow-[0_0_30px_#22c55e]">{t('ood.log_report')}</Button>
                    </>
                ) : (
                    <>
                        <h2 className="text-5xl font-black text-red-500 mb-4 tracking-tighter">{t('ood.breached')}</h2>
                        <AlertTriangle size={80} className="text-red-500 mx-auto mb-8 animate-shake" />
                        <p className="text-gray-400 mb-8">{t('ood.integrity_loss')}</p>
                        <Button onClick={() => window.location.reload()} variant="secondary">{t('ood.reboot')}</Button>
                    </>
                )}
            </div>
        )}
    </div>
  );
};
