
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { audio } from '../../services/audioService';
import { Play, RotateCcw, ArrowUp, ArrowLeft, ArrowRight, Cpu, Zap, Flag, Flame, CheckCircle, ShoppingBag, Map } from 'lucide-react';
import { Difficulty, Language, GameType, UserStats } from '../../types';
import { Scanlines, Vignette } from '../ui/Visuals';
import { SkinShop } from '../ui/SkinShop';
import { GAME_SKINS } from '../../constants';

interface NeonDriftProps {
  onComplete: (score: number) => void;
  difficulty?: Difficulty;
  t: (key: string) => string;
  language?: Language;
  user?: UserStats;
  onUpdateUser?: (user: UserStats) => void;
}

type Command = 'FORWARD' | 'LEFT' | 'RIGHT' | 'BOOST';

export const NeonDrift: React.FC<NeonDriftProps> = ({ onComplete, difficulty = 'Pro', t, user, onUpdateUser }) => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'CRASHED' | 'WIN'>('IDLE');
  const [feedback, setFeedback] = useState('');
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [showShop, setShowShop] = useState(false);
  const [trackMap, setTrackMap] = useState<number[][]>([]);
  
  const commandLimit = difficulty === 'Rookie' ? 15 : difficulty === 'Elite' ? 10 : 12;
  const gridSize = difficulty === 'Rookie' ? 6 : difficulty === 'Elite' ? 8 : 7;
  
  // Visual Grid State
  const [carPos, setCarPos] = useState({ x: 1, y: 1, rotation: 0 }); 
  const carRef = useRef({ x: 1, y: 1, rotation: 0 });
  const [particles, setParticles] = useState<{id: number, x: number, y: number, color: string}[]>([]);
  const [skidMarks, setSkidMarks] = useState<{x: number, y: number, opacity: number}[]>([]);
  const carSpriteRef = useRef<HTMLImageElement | null>(null);

  // --- PROCEDURAL GENERATION ---
  const generateTrack = () => {
      const size = gridSize;
      const newMap = Array(size).fill(null).map(() => Array(size).fill(4)); // Fill with Walls (4)
      
      let x = 1;
      let y = 1;
      newMap[y][x] = 2; // Start

      // Random Walk to generate path
      let steps = 0;
      const maxSteps = size * size; // Safety break
      
      while (steps < maxSteps) {
          // Determine possible moves
          const moves = [];
          if (x + 1 < size - 1) moves.push({ dx: 1, dy: 0 });
          if (y + 1 < size - 1) moves.push({ dx: 0, dy: 1 });
          // Bias towards goal (bottom right)
          
          if (moves.length === 0) break; // Trapped

          // Simple heuristic: Try not to go back, try to move generally down/right
          const move = moves[Math.floor(Math.random() * moves.length)];
          
          x += move.dx;
          y += move.dy;
          
          if (newMap[y][x] === 4) {
              newMap[y][x] = 1; // Track
              // Chance for Boost Pad (5)
              if (Math.random() > 0.8) newMap[y][x] = 5;
          }

          // Goal Condition: Near bottom right
          if (x >= size - 2 && y >= size - 2) {
              newMap[y][x] = 3; // Goal
              break;
          }
          steps++;
      }
      
      // Fallback if generator failed to reach deep enough
      if (newMap[y][x] !== 3) newMap[y][x] = 3;

      setTrackMap(newMap);
      // Reset car
      setCarPos({ x: 1, y: 1, rotation: 0 }); 
      carRef.current = { x: 1, y: 1, rotation: 0 };
  };

  useEffect(() => {
      generateTrack();
  }, [difficulty]);

  // Load Car Skin
  useEffect(() => {
      const skinId = user?.equippedSkins?.[GameType.NEON_DRIFT] || 'drift_default';
      const skin = GAME_SKINS.find(s => s.id === skinId);
      if (skin) {
          const img = new Image();
          img.src = skin.assetUrl;
          carSpriteRef.current = img;
      }
  }, [user?.equippedSkins]);

  useEffect(() => {
      if(status === 'IDLE') {
          setCarPos({ x: 1, y: 1, rotation: 0 });
          carRef.current = { x: 1, y: 1, rotation: 0 };
          setParticles([]);
          setSkidMarks([]);
      }
  }, [status]);

  const spawnParticles = (x: number, y: number, color: string, count: number = 5) => {
      const newParts = Array.from({length: count}).map(() => ({
          id: Math.random(),
          x: x * 50 + 25 + (Math.random() * 20 - 10), 
          y: y * 50 + 25 + (Math.random() * 20 - 10),
          color
      }));
      setParticles(p => [...p, ...newParts]);
      setTimeout(() => setParticles(p => p.slice(count)), 500);
  };

  const addSkidMark = (x: number, y: number) => {
      setSkidMarks(prev => [...prev, { x: x * 50 + 25, y: y * 50 + 25, opacity: 1 }]);
  };

  // --- SMOOTH EXECUTION ENGINE ---
  const handleRun = async () => {
    setStatus('RUNNING');
    setFeedback(t('architect.processing')); 
    audio.playEngine(3000);
    audio.vibrate(audio.haptics.medium); 
    
    let currentX = 1;
    let currentY = 1;
    let currentRot = 0; 
    let crashed = false;

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < commands.length; i++) {
        setActiveStep(i);
        const cmd = commands[i];
        
        // 1. Turn Phase
        if (cmd === 'LEFT' || cmd === 'RIGHT') {
            const startRot = currentRot;
            const dir = cmd === 'LEFT' ? -90 : 90;
            const targetRot = currentRot + dir;
            currentRot = (currentRot + dir + 360) % 360;
            audio.playHover();
            audio.vibrate(5); 
            
            for(let t=0; t<=1; t+=0.1) {
                carRef.current.rotation = startRot + (targetRot - startRot) * t;
                setCarPos({...carRef.current});
                if (t > 0.5) addSkidMark(carRef.current.x, carRef.current.y);
                await wait(20);
            }
        } 

        // 2. Move Phase
        let moveDistance = 1;
        if (cmd === 'BOOST') {
            moveDistance = 2; // Jump logic
            audio.vibrate(audio.haptics.impact); 
        }
        
        if (cmd === 'FORWARD' || cmd === 'BOOST') {
            let dx = 0, dy = 0;
            if (Math.abs(currentRot - 0) < 10 || Math.abs(currentRot - 360) < 10) dx = 1;
            else if (Math.abs(currentRot - 90) < 10 || Math.abs(currentRot + 270) < 10) dy = 1;
            else if (Math.abs(currentRot - 180) < 10 || Math.abs(currentRot + 180) < 10) dx = -1;
            else dy = -1;

            for(let dist=0; dist < moveDistance; dist++) {
                const nextX = currentX + dx;
                const nextY = currentY + dy;
                
                const startX = currentX;
                const startY = currentY;
                
                const steps = cmd === 'BOOST' ? 0.2 : 0.1; 
                for(let t=0; t<=1; t+=steps) {
                    carRef.current.x = startX + (nextX - startX) * t;
                    carRef.current.y = startY + (nextY - startY) * t;
                    setCarPos({...carRef.current});
                    if(cmd === 'BOOST') spawnParticles(carRef.current.x, carRef.current.y, '#F59E0B', 2);
                    await wait(20);
                }

                // Check Wall Collision
                if (trackMap[nextY] && trackMap[nextY][nextX] !== 4 && nextX >= 0 && nextX < gridSize && nextY >= 0 && nextY < gridSize) {
                    currentX = nextX;
                    currentY = nextY;
                    
                    // Boost Pad Logic (In-game modifier)
                    if (trackMap[currentY][currentX] === 5 && cmd !== 'BOOST') {
                        // Auto-slide 1 more
                        spawnParticles(currentX, currentY, '#F59E0B', 10);
                        audio.playScan();
                        // Recursive slide logic (simplified for this update)
                    }

                } else {
                    crashed = true;
                    spawnParticles(nextX, nextY, '#EF4444', 10);
                    audio.playError();
                    audio.vibrate(audio.haptics.failure); 
                    break;
                }
            }
        }
        
        if (crashed) break;
        await wait(100); 
    }

    // Final Check
    if (!crashed && trackMap[currentY] && trackMap[currentY][currentX] === 3) {
       setStatus('WIN');
       audio.playSuccess();
       setFeedback(t('neondrift.course_clear'));
    } else {
       setStatus('CRASHED');
       if (!crashed) audio.playError(); 
       setFeedback(t('neondrift.crashed'));
    }
    setActiveStep(-1);
  };

  const addCommand = (cmd: Command) => {
      if (commands.length < commandLimit) {
          setCommands([...commands, cmd]);
          audio.playClick();
      }
  };

  return (
    <div className="h-full flex flex-col p-4 relative overflow-hidden bg-slate-950 font-mono select-none">
      <Scanlines />
      <Vignette />

      {/* SHOP OVERLAY */}
      {showShop && user && onUpdateUser && (
          <SkinShop 
              gameType={GameType.NEON_DRIFT}
              user={user}
              onUpdateUser={onUpdateUser}
              onClose={() => setShowShop(false)}
          />
      )}

      {/* --- VISUALIZER --- */}
      <div className="flex-1 bg-[#0a0a0a] rounded-xl border-2 border-slate-800 relative overflow-hidden flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] perspective-[800px]">
        {/* Grid Floor */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[length:50px_50px] transform scale-150 opacity-30"></div>

        <div className="absolute top-4 right-4 z-30">
            <Button size="sm" variant="ghost" onClick={() => { generateTrack(); setCommands([]); setStatus('IDLE'); }}>
                <Map size={16} className="mr-2"/> GEN
            </Button>
        </div>

        <div className="relative transform rotate-x-30 transition-transform duration-500 scale-90">
           <div className="grid gap-1 p-4" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
               {trackMap.flat().map((cell, i) => {
                   return (
                     <div key={i} className={`w-12 h-12 rounded-md flex items-center justify-center relative ${
                       cell === 4 ? 'bg-transparent' : 
                       cell === 2 ? 'bg-cyan-900/50 border-2 border-cyan-500' :
                       cell === 3 ? 'bg-purple-900/50 border-2 border-purple-500' :
                       cell === 5 ? 'bg-amber-900/50 border-2 border-amber-500' :
                       'bg-slate-800/80 border border-slate-700 shadow-inner'
                     }`}>
                       {cell === 1 && <div className="w-1 h-1 bg-white/20 rounded-full"></div>}
                       {cell === 3 && <Flag className="text-purple-400 w-6 h-6 animate-bounce drop-shadow-[0_0_5px_#C45FFF]" />}
                       {cell === 5 && <div className="text-amber-500 font-bold text-[10px] animate-pulse">>>></div>}
                     </div>
                   );
               })}
           </div>

           {/* Skid Marks Layer */}
           <div className="absolute inset-0 pointer-events-none">
               {skidMarks.map((mark, i) => (
                   <div 
                     key={i} 
                     className="absolute w-2 h-2 bg-black opacity-50 rounded-full"
                     style={{ left: mark.x, top: mark.y }}
                   ></div>
               ))}
           </div>

           {/* THE CAR (SPRITE) */}
           <div 
             className="absolute top-4 left-4 w-12 h-12 flex items-center justify-center z-20 transition-none"
             style={{ 
                 transform: `translate(${carPos.x * 52}px, ${carPos.y * 52}px)`
             }}
           >
               <div 
                 className="w-10 h-10 relative flex items-center justify-center"
                 style={{ transform: `rotate(${carPos.rotation}deg)` }}
               >
                   {carSpriteRef.current ? (
                       <img src={carSpriteRef.current.src} className="w-full h-full object-contain drop-shadow-[0_0_10px_#22d3ee]" alt="Car" />
                   ) : (
                       <div className="w-8 h-5 bg-cyan-400 rounded shadow-[0_0_20px_#22d3ee] relative flex items-center">
                           <div className="absolute -right-1 h-full w-1 bg-white rounded-r opacity-80"></div>
                           <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-2 bg-black/20 rounded"></div>
                       </div>
                   )}
                   {/* Headlights */}
                   <div className="absolute right-0 w-20 h-16 bg-gradient-to-r from-cyan-500/0 to-cyan-200/20 transform rotate-0 blur-lg pointer-events-none"></div>
               </div>
           </div>

           {/* Particles */}
           {particles.map((p) => (
               <div 
                 key={p.id} 
                 className="absolute w-1.5 h-1.5 rounded-full animate-ping pointer-events-none"
                 style={{ left: p.x, top: p.y, backgroundColor: p.color }}
               ></div>
           ))}
        </div>
        
        {status === 'CRASHED' && (
          <div className="absolute inset-0 bg-red-950/80 flex flex-col items-center justify-center backdrop-blur-sm animate-shake z-30">
             <Flame size={48} className="text-red-500 mb-2"/>
             <h2 className="text-3xl font-black text-white tracking-widest glitch-text">{t('neondrift.crashed')}</h2>
          </div>
        )}
         {status === 'WIN' && (
          <div className="absolute inset-0 bg-green-950/80 flex flex-col items-center justify-center backdrop-blur-sm z-30">
             <CheckCircle size={48} className="text-green-500 mb-2"/>
             <h2 className="text-3xl font-black text-white tracking-widest">{t('neondrift.course_clear')}</h2>
          </div>
        )}
      </div>

      {/* --- COMMAND DECK --- */}
      <div className="bg-black/50 border border-slate-700 rounded-xl p-4 space-y-4 relative z-10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-cyan-400 uppercase flex items-center"><Cpu size={10} className="mr-1"/> {t('neondrift.logic_buffer')}</span>
            <div className="flex items-center space-x-3">
                {user && onUpdateUser && (
                    <button onClick={() => setShowShop(true)} className="text-xs font-bold text-amber-400 flex items-center hover:text-white">
                        <ShoppingBag size={12} className="mr-1" /> Loadout
                    </button>
                )}
                <span className={`text-[10px] font-mono ${commands.length > commandLimit ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                    {commands.length}/{commandLimit} {t('neondrift.ops')}
                </span>
            </div>
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2 min-h-[50px] scrollbar-hide items-center px-1">
          {commands.length === 0 && <span className="text-gray-600 text-xs italic font-mono w-full text-center opacity-50">{t('neondrift.input_required')}</span>}
          {commands.map((c, i) => (
            <div key={i} className={`px-2 py-1 rounded border flex-shrink-0 flex items-center font-bold text-[10px] shadow-sm transition-all ${
                activeStep === i 
                ? 'bg-yellow-500 text-black border-yellow-400 scale-110 shadow-[0_0_15px_rgba(234,179,8,0.5)]' 
                : 'bg-slate-800 border-slate-600 text-cyan-300'
            }`}>
              {c === 'FORWARD' ? <ArrowUp size={12}/> : c === 'LEFT' ? <ArrowLeft size={12}/> : c === 'RIGHT' ? <ArrowRight size={12}/> : <Zap size={12}/>}
            </div>
          ))}
        </div>

        {status !== 'WIN' && (
          <div className="grid grid-cols-4 gap-2">
            <Button variant="secondary" size="sm" onClick={() => addCommand('LEFT')} className="h-12 active:bg-cyan-900/50 border-slate-700"><ArrowLeft size={18}/></Button>
            <Button variant="secondary" size="sm" onClick={() => addCommand('FORWARD')} className="h-12 active:bg-cyan-900/50 border-slate-700"><ArrowUp size={18}/></Button>
            <Button variant="secondary" size="sm" onClick={() => addCommand('RIGHT')} className="h-12 active:bg-cyan-900/50 border-slate-700"><ArrowRight size={18}/></Button>
            <Button variant="secondary" size="sm" onClick={() => addCommand('BOOST')} className="h-12 active:bg-amber-900/50 border-amber-700 text-amber-500"><Zap size={18}/></Button>
          </div>
        )}

        <div className="flex space-x-2 pt-2 border-t border-white/5">
          <Button variant="ghost" onClick={() => {setCommands([]); setStatus('IDLE'); setFeedback(''); audio.playClick(); }}><RotateCcw size={18}/></Button>
          {status === 'WIN' ? (
             <Button fullWidth variant="primary" onClick={() => onComplete(100)} className="shadow-[0_0_20px_#22c55e]">{t('neondrift.claim_data')}</Button>
          ) : (
             <Button fullWidth variant="primary" onClick={handleRun} disabled={status === 'RUNNING'}>
               {status === 'RUNNING' ? <span className="animate-pulse">{t('neondrift.executing')}</span> : <><Play size={18} className="mr-2" /> {t('neondrift.compile_run')}</>}
             </Button>
          )}
        </div>
        
        {feedback && (
            <div className="absolute top-[-40px] left-0 right-0 text-center">
                <span className="bg-black/80 text-cyan-400 text-xs px-3 py-1 rounded border border-cyan-500/30 font-mono shadow-lg">{feedback}</span>
            </div>
        )}
      </div>
    </div>
  );
};
