
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { audio } from '../../services/audioService';
import { Zap, Disc, Activity, AlertOctagon, Music, Star } from 'lucide-react';
import { Scanlines } from '../ui/Visuals';
import { Language } from '../../types';

interface TokenTsunamiProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

interface Note {
    id: number;
    lane: number; // 0-3
    y: number; // 0-100
    type: 'SIGNAL' | 'NOISE' | 'GOLD';
    hit: boolean;
}

interface Feedback {
    id: number;
    lane: number;
    text: string;
    color: string;
    y: number;
}

const LANES = 4;
const HIT_ZONE = 85;
const HIT_WINDOW = 15;

export const TokenTsunami: React.FC<TokenTsunamiProps> = ({ onComplete, t }) => {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'END'>('MENU');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [health, setHealth] = useState(100);
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [activeLane, setActiveLane] = useState<number | null>(null);
  
  // Refs
  const notesRef = useRef<Note[]>([]);
  const reqRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const speedRef = useRef(35); 

  // Audio Sync Mock
  useEffect(() => {
      if (gameState === 'PLAYING') {
          audio.startAmbience('CYBER');
      } else {
          audio.stopAmbience();
      }
  }, [gameState]);

  const loop = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Spawn
      spawnTimerRef.current -= dt;
      if (spawnTimerRef.current <= 0) {
          spawnTimerRef.current = Math.max(0.2, 0.5 - (score / 5000)); // Faster over time
          const lane = Math.floor(Math.random() * LANES);
          const typeRoll = Math.random();
          let type: Note['type'] = 'SIGNAL';
          if (typeRoll > 0.8) type = 'NOISE';
          if (typeRoll > 0.95) type = 'GOLD';

          notesRef.current.push({
              id: Date.now() + Math.random(),
              lane,
              y: -10,
              type,
              hit: false
          });
      }

      // Move
      notesRef.current.forEach(n => {
          n.y += speedRef.current * dt;
      });

      // Miss Check
      const missed = notesRef.current.filter(n => n.y > 110 && !n.hit);
      if (missed.length > 0) {
          missed.forEach(m => {
              if (m.type === 'SIGNAL' || m.type === 'GOLD') {
                  setCombo(0);
                  setMultiplier(1);
                  setHealth(h => Math.max(0, h - 10));
                  spawnFeedback(m.lane, "MISS", "text-red-500");
              }
          });
          // Cleanup
          notesRef.current = notesRef.current.filter(n => n.y <= 110);
      }

      setNotes([...notesRef.current]);

      if (health <= 0) {
          setGameState('END');
          audio.playError();
      } else {
          reqRef.current = requestAnimationFrame(loop);
      }
  };

  const startGame = () => {
      setScore(0);
      setHealth(100);
      setCombo(0);
      setMultiplier(1);
      notesRef.current = [];
      setGameState('PLAYING');
      lastTimeRef.current = performance.now();
      reqRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
      return () => cancelAnimationFrame(reqRef.current);
  }, []);

  const spawnFeedback = (lane: number, text: string, color: string) => {
      const id = Date.now() + Math.random();
      setFeedbacks(prev => [...prev, { id, lane, text, color, y: 70 }]);
      setTimeout(() => {
          setFeedbacks(prev => prev.filter(f => f.id !== id));
      }, 600);
  };

  const handleHit = (lane: number) => {
      if (gameState !== 'PLAYING') return;
      
      setActiveLane(lane);
      setTimeout(() => setActiveLane(null), 150);

      // Find closest note in lane
      const hits = notesRef.current.filter(n => n.lane === lane && Math.abs(n.y - HIT_ZONE) < HIT_WINDOW && !n.hit);
      
      if (hits.length > 0) {
          const target = hits[0]; // Earliest one
          target.hit = true;
          
          if (target.type === 'NOISE') {
              setCombo(0);
              setMultiplier(1);
              setHealth(h => Math.max(0, h - 20));
              audio.playError();
              spawnFeedback(lane, "CORRUPT", "text-red-600");
              audio.vibrate([50, 50]);
          } else {
              // Accuracy check
              const diff = Math.abs(target.y - HIT_ZONE);
              let points = 100;
              let label = "GOOD";
              let color = "text-cyan-400";

              if (diff < 5) { points = 300; label = "PERFECT!"; color = "text-yellow-400"; }
              else if (diff < 10) { points = 200; label = "GREAT"; color = "text-green-400"; }

              if (target.type === 'GOLD') { points *= 2; label = "JACKPOT"; color = "text-purple-400"; }

              setScore(s => s + (points * multiplier));
              setCombo(c => {
                  const next = c + 1;
                  if (next % 10 === 0) { setMultiplier(m => Math.min(8, m * 2)); audio.playSuccess(); } 
                  return next;
              });
              setHealth(h => Math.min(100, h + 2)); 
              audio.playClick();
              spawnFeedback(lane, label, color);
          }
          
          notesRef.current = notesRef.current.filter(n => n.id !== target.id);
          setNotes([...notesRef.current]);
      } else {
          setCombo(0);
          setMultiplier(1);
      }
  };

  return (
    <div className="h-full flex flex-col bg-[#050505] relative overflow-hidden font-mono select-none touch-none">
        <Scanlines />
        
        {/* --- PERSPECTIVE TRACK --- */}
        <div className="flex-1 relative perspective-[600px] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e] to-black transform-style-3d">
                {/* Floor Grid */}
                <div className="absolute inset-0 origin-bottom transform rotate-x-60 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[length:50px_50px] animate-pulse-slow"></div>
                
                {/* Lanes */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex transform-style-3d border-x border-white/10">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex-1 border-r border-white/5 relative group">
                            {/* Track Glow on press */}
                            <div className={`absolute inset-0 bg-gradient-to-t from-cyan-500/30 to-transparent transition-opacity duration-150 ${activeLane === i ? 'opacity-100' : 'opacity-0'}`}></div>
                            
                            {/* Hit Marker Line */}
                            <div className={`absolute left-0 right-0 h-1 bg-cyan-500/50 blur-[2px] ${activeLane === i ? 'bg-white shadow-[0_0_15px_white]' : ''}`} style={{ top: `${HIT_ZONE}%` }}></div>
                        </div>
                    ))}
                </div>

                {/* Notes */}
                {notes.map(note => {
                    const scale = 0.5 + (note.y/100);
                    return (
                        <div 
                            key={note.id}
                            className={`absolute left-1/2 -translate-x-1/2 w-16 h-8 rounded-sm shadow-[0_0_15px_currentColor] flex items-center justify-center font-bold text-xs transition-transform will-change-transform
                                ${note.type === 'GOLD' ? 'bg-yellow-400 text-black border-2 border-white' : note.type === 'NOISE' ? 'bg-red-600 text-white' : 'bg-cyan-500 text-black'}
                            `}
                            style={{ 
                                top: `${note.y}%`,
                                marginLeft: `${(note.lane - 1.5) * 25}%`, // Keeps note centered in respective lane
                                transform: `translate(-50%, -50%) scale(${scale})`, 
                                zIndex: Math.floor(note.y),
                                opacity: note.y < 0 ? 0 : 1
                            }}
                        >
                            {note.type === 'NOISE' ? 'ERR' : note.type === 'GOLD' ? '$$$' : 'DAT'}
                        </div>
                    );
                })}
            </div>
            
            {/* Feedback Popups (Constrained to Track Width) */}
            <div className="absolute inset-0 w-full max-w-md left-1/2 -translate-x-1/2 pointer-events-none z-30">
                {feedbacks.map(f => (
                    <div 
                        key={f.id}
                        className={`absolute font-black text-xl md:text-2xl animate-float-fast ${f.color} drop-shadow-[0_0_5px_rgba(0,0,0,0.8)] text-center w-1/4`}
                        style={{ 
                            top: `${f.y}%`,
                            left: `${f.lane * 25}%`, // Position relative to the container
                        }}
                    >
                        {f.text}
                    </div>
                ))}
            </div>
        </div>

        {/* --- HUD --- */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-16 flex justify-between items-end bg-gradient-to-b from-black to-transparent z-20 pointer-events-none">
            <div className="pointer-events-auto">
                <div className="flex items-center space-x-2 mb-1">
                    <div className="text-4xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_cyan]">{score.toLocaleString()}</div>
                    <div className="text-xl font-bold text-yellow-400 animate-bounce">x{multiplier}</div>
                </div>
                <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                    <div className={`h-full transition-all duration-200 ${health < 30 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} style={{ width: `${health}%` }}></div>
                </div>
            </div>
            {combo > 5 && (
                <div className="text-center">
                    <div className="text-5xl font-black text-white italic drop-shadow-[4px_4px_0px_#06b6d4] animate-pulse">{combo}</div>
                    <div className="text-xs text-cyan-400 uppercase font-bold tracking-[0.5em]">COMBO</div>
                </div>
            )}
        </div>

        {/* --- TOUCH CONTROLS --- */}
        <div className="h-40 bg-black border-t-2 border-cyan-900 grid grid-cols-4 gap-1 p-2 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] safe-area-pb">
            {[0, 1, 2, 3].map(i => (
                <button
                    key={i}
                    onPointerDown={(e) => { e.preventDefault(); handleHit(i); }}
                    className="rounded-xl bg-gray-900 border border-gray-700 active:bg-cyan-500 active:border-white transition-all relative overflow-hidden group touch-manipulation active:scale-95"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent opacity-0 group-active:opacity-100"></div>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-gray-600 group-active:bg-white group-active:border-white transition-all flex items-center justify-center">
                        <div className="w-2 h-2 bg-gray-600 rounded-full group-active:bg-cyan-500"></div>
                    </div>
                </button>
            ))}
        </div>

        {/* --- MENUS --- */}
        {gameState === 'MENU' && (
            <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in backdrop-blur-sm">
                <div className="relative mb-6">
                    <Music size={80} className="text-cyan-500 animate-bounce relative z-10" />
                    <div className="absolute inset-0 bg-cyan-500/30 blur-2xl animate-pulse"></div>
                </div>
                <h1 className="text-5xl font-black text-white mb-2 italic tracking-tighter">TOKEN <span className="text-cyan-500">TSUNAMI</span></h1>
                <p className="text-gray-400 mb-10 max-w-xs text-sm font-mono border-l-4 border-cyan-500 pl-4 text-left">
                    {t('token.desc')}<br/>
                    <span className="text-cyan-400">TAP</span> to sync.<br/>
                    <span className="text-yellow-400">GOLD</span> gives 2x points.<br/>
                    <span className="text-red-500">RED</span> breaks combo.
                </p>
                <Button size="lg" variant="primary" onClick={startGame} className="shadow-[0_0_40px_#06b6d4] h-16 w-48 text-lg font-bold">
                    {t('token.start')}
                </Button>
            </div>
        )}

        {gameState === 'END' && (
            <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in border-y-[20px] border-cyan-900">
                <h2 className="text-3xl font-black text-white mb-4 uppercase italic">{t('token.session_ended')}</h2>
                <div className="text-6xl font-black font-mono text-cyan-400 mb-2 drop-shadow-[0_0_15px_cyan]">{score.toLocaleString()}</div>
                <div className="text-sm text-gray-500 font-bold mb-8">MAX COMBO: {combo}</div>
                <Button size="lg" variant="primary" onClick={() => onComplete(Math.min(100, score / 100))}>{t('token.submit')}</Button>
            </div>
        )}
    </div>
  );
};
