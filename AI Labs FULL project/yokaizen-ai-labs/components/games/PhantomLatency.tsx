
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { explainLogicGate } from '../../services/geminiService';
import { ArrowUp, RotateCw, RotateCcw, Cpu, Eye, ShieldAlert, Skull, Hand } from 'lucide-react';
import { Language } from '../../types';

interface PhantomLatencyProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

// Map: 0=Empty, 1=Wall, 2=Enemy, 3=Goal
const LEVEL_MAP = [
    [1,1,1,1,1,1,1,1],
    [1,2,0,0,1,0,3,1],
    [1,0,1,0,1,0,1,1],
    [1,0,1,0,0,0,0,1],
    [1,0,1,1,1,1,0,1],
    [1,0,0,2,0,0,0,1],
    [1,1,1,1,1,1,1,1]
];

type Direction = 0 | 1 | 2 | 3; // N, E, S, W

export const PhantomLatency: React.FC<PhantomLatencyProps> = ({ onComplete, t }) => {
  const [pos, setPos] = useState({ x: 1, y: 5 }); 
  const [dir, setDir] = useState<Direction>(1); 
  const [viewState, setViewState] = useState<'EXPLORE' | 'COMBAT' | 'WIN'>('EXPLORE');
  const [combatGate, setCombatGate] = useState<'AND' | 'OR' | 'XOR'>('AND');
  const [inputs, setInputs] = useState([false, false]); 
  const [feedback, setFeedback] = useState('');
  const [visited, setVisited] = useState<string[]>(['1,5']);
  
  // Swipe Logic
  const touchStart = useRef<{x: number, y: number} | null>(null);

  const checkCombat = async () => {
      let success = false;
      if (combatGate === 'AND') success = inputs[0] && inputs[1];
      if (combatGate === 'OR') success = inputs[0] || inputs[1];
      if (combatGate === 'XOR') success = inputs[0] !== inputs[1];

      if (success) {
          setFeedback(t('phantom.access_granted'));
          setTimeout(() => {
              setViewState('EXPLORE');
              setFeedback('');
              moveForward(true); 
          }, 1500);
      } else {
          const tip = await explainLogicGate(combatGate, false);
          setFeedback(`${t('phantom.access_denied')} ${tip}`);
      }
  };

  const moveForward = (force = false) => {
      let dx = 0, dy = 0;
      if (dir === 0) dy = -1; // N
      if (dir === 1) dx = 1;  // E
      if (dir === 2) dy = 1;  // S
      if (dir === 3) dx = -1; // W

      const nx = pos.x + dx;
      const ny = pos.y + dy;
      
      if (LEVEL_MAP[ny] && LEVEL_MAP[ny][nx] !== 1) {
          if (!force && LEVEL_MAP[ny][nx] === 2) {
              setCombatGate(['AND', 'OR', 'XOR'][Math.floor(Math.random()*3)] as any);
              setInputs([false, false]);
              setViewState('COMBAT');
              return;
          }
          if (LEVEL_MAP[ny][nx] === 3) {
              setViewState('WIN');
              setTimeout(() => onComplete(100), 2000);
              return;
          }

          setPos({ x: nx, y: ny });
          if (!visited.includes(`${nx},${ny}`)) setVisited(p => [...p, `${nx},${ny}`]);
      }
  };

  const turn = (clockWise: boolean) => {
      setDir(prev => {
          let next = prev + (clockWise ? 1 : -1);
          if (next > 3) next = 0;
          if (next < 0) next = 3;
          return next as Direction;
      });
  };

  // --- Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < 10) {
          return;
      }

      if (absDx > absDy) {
          if (dx > 0) turn(true); // Right
          else turn(false); // Left
      } else {
          if (dy < 0) moveForward(); // Up
      }
      touchStart.current = null;
  };

  const cellSize = 300; 
  
  return (
    <div className="h-full bg-black flex flex-col font-mono relative overflow-hidden select-none">
        
        {/* --- 3D VIEWPORT --- */}
        <div 
            className="flex-1 relative overflow-hidden perspective-1000 touch-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
             <div 
               className="absolute top-1/2 left-1/2 w-0 h-0 transition-transform duration-500 ease-in-out transform-style-3d"
               style={{
                   transform: `translateZ(600px) rotateX(0deg) rotateY(${-dir * 90}deg) translate3d(${-pos.x * cellSize}px, 0, ${-pos.y * cellSize}px)`
               }}
             >
                 {/* Floor & Ceiling */}
                 <div className="absolute inset-[-2000px] bg-gray-900 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[length:100px_100px] transform rotateX(90deg) translateZ(150px)" />
                 <div className="absolute inset-[-2000px] bg-transparent bg-[linear-gradient(rgba(196,95,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(196,95,255,0.05)_1px,transparent_1px)] bg-[length:100px_100px] transform rotateX(90deg) translateZ(-150px)" />

                 {LEVEL_MAP.map((row, y) => row.map((cell, x) => {
                     if (cell === 0) return null;
                     const style = { transform: `translate3d(${x * cellSize}px, 0, ${y * cellSize}px)` };

                     if (cell === 1) { // Wall
                         return (
                             <div key={`${x}-${y}`} className="absolute w-[300px] h-[300px] transform-style-3d" style={style}>
                                 <div className="absolute inset-0 bg-gray-900 border-2 border-cyan/50 translate-z-[150px] flex items-center justify-center text-cyan/20 text-4xl font-black">#</div>
                                 <div className="absolute inset-0 bg-gray-900 border-2 border-cyan/50 rotate-y-90 translate-z-[150px]"></div>
                                 <div className="absolute inset-0 bg-gray-900 border-2 border-cyan/50 rotate-y-180 translate-z-[150px]"></div>
                                 <div className="absolute inset-0 bg-gray-900 border-2 border-cyan/50 rotate-y-270 translate-z-[150px]"></div>
                             </div>
                         );
                     }
                     if (cell === 2) { // Enemy
                         return (
                             <div key={`${x}-${y}`} className="absolute w-[300px] h-[300px] flex items-center justify-center" style={style}>
                                 <div className="w-32 h-32 bg-red-900/50 border-4 border-red-500 rounded-full animate-pulse flex items-center justify-center shadow-[0_0_50px_#ef4444]">
                                     <Skull size={64} className="text-red-500 animate-spin-slow" />
                                 </div>
                             </div>
                         );
                     }
                     if (cell === 3) { // Goal
                         return (
                             <div key={`${x}-${y}`} className="absolute w-[300px] h-[300px] flex items-center justify-center" style={style}>
                                 <div className="w-20 h-20 bg-green-500 border-4 border-white animate-bounce flex items-center justify-center shadow-[0_0_50px_#10b981]">
                                     <Cpu size={40} className="text-white" />
                                 </div>
                             </div>
                         );
                     }
                 }))}
             </div>
             
             <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_50%,black_100%)]"></div>
             
             {/* Tutorial Hint */}
             {viewState === 'EXPLORE' && (
                 <div className="absolute bottom-10 w-full text-center pointer-events-none animate-pulse text-xs text-cyan-500 font-bold">
                     <Hand className="inline mr-1" size={14}/> {t('phantom.swipe')}
                 </div>
             )}
        </div>

        {/* --- COMBAT OVERLAY --- */}
        {viewState === 'COMBAT' && (
            <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-200">
                <div className="w-full max-w-sm border-2 border-red-500 bg-red-900/20 p-6 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black text-red-500 blink">{t('phantom.breach')}</h3>
                        <ShieldAlert className="text-red-500 animate-pulse" size={32} />
                    </div>
                    
                    <div className="text-center mb-8">
                        <div className="text-sm text-gray-400 uppercase mb-2">{t('phantom.firewall')}</div>
                        <div className="text-5xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">{combatGate}</div>
                        <div className="text-xs text-red-400 mt-2">{t('phantom.target_output')}</div>
                    </div>

                    <div className="flex justify-center space-x-6 mb-8">
                        {[0, 1].map(i => (
                            <div key={i} className="text-center">
                                <div className="text-xs text-gray-500 mb-2">{t('phantom.input')} {String.fromCharCode(65+i)}</div>
                                <button 
                                  onClick={() => {
                                      const newInputs = [...inputs];
                                      newInputs[i] = !newInputs[i];
                                      setInputs(newInputs);
                                  }}
                                  className={`w-16 h-16 rounded border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                                      inputs[i] 
                                      ? 'bg-cyan border-cyan text-black shadow-[0_0_20px_#00FFFF]' 
                                      : 'bg-black border-gray-700 text-gray-600'
                                  }`}
                                >
                                    {inputs[i] ? '1' : '0'}
                                </button>
                            </div>
                        ))}
                    </div>

                    {feedback && (
                        <div className="bg-black/50 border border-white/10 p-3 rounded mb-4 text-center text-xs text-amber-400 font-bold animate-pulse">
                            {feedback}
                        </div>
                    )}

                    <Button fullWidth variant="danger" onClick={checkCombat}>{t('phantom.execute')}</Button>
                </div>
            </div>
        )}
        
        {/* --- WIN SCREEN --- */}
        {viewState === 'WIN' && (
            <div className="absolute inset-0 z-20 bg-green-900/90 flex flex-col items-center justify-center animate-in zoom-in">
                <h2 className="text-4xl font-black text-white mb-4">{t('phantom.rooted')}</h2>
                <div className="text-green-300 font-mono">{t('phantom.latency')}</div>
            </div>
        )}

        {/* --- MINIMAP --- */}
        <div className="absolute top-4 right-4 w-24 h-24 border border-white/20 bg-black/80 p-1 grid grid-cols-8 grid-rows-7 gap-px pointer-events-none">
            {LEVEL_MAP.map((row, y) => row.map((cell, x) => {
                const isVisited = visited.includes(`${x},${y}`);
                const isPlayer = pos.x === x && pos.y === y;
                
                let color = 'bg-transparent';
                if (isVisited || isPlayer) {
                    if (cell === 1) color = 'bg-gray-600'; 
                    if (cell === 2) color = 'bg-red-900'; 
                    if (cell === 3) color = 'bg-green-900'; 
                }
                
                return (
                    <div key={`${x}-${y}`} className={`w-full h-full ${color} flex items-center justify-center`}>
                        {isPlayer && (
                            <div 
                              className="w-1.5 h-1.5 bg-cyan rounded-full transform" 
                              style={{ transform: `rotate(${dir * 90}deg)` }}
                            >
                                <div className="w-0 h-0 border-l-[2px] border-l-transparent border-r-[2px] border-r-transparent border-b-[4px] border-b-black absolute -top-0.5 left-1/2 -translate-x-1/2"></div>
                            </div>
                        )}
                    </div>
                );
            }))}
        </div>
    </div>
  );
};
