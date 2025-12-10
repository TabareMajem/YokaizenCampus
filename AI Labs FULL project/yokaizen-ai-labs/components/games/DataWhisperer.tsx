
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Database, Skull, Zap, Activity, Play, ShieldAlert, Terminal, Wifi, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { audio } from '../../services/audioService';
import { Scanlines, Vignette } from '../ui/Visuals';
import { Language } from '../../types';

interface DataWhispererProps {
  onComplete: (score: number) => void;
  t: (key: string) => string;
  language?: Language;
}

// --- TYPES ---
type Lane = -1 | 0 | 1; // Left, Center, Right

interface Entity {
    id: number;
    z: number; // Depth: -2000 (Far) -> 200 (Behind Camera)
    lane: Lane;
    type: 'DATA' | 'ICE';
    val?: string | number;
    isTarget?: boolean; // Matches the query
    hit?: boolean;
}

interface Query {
    text: string;
    predicate: (val: string | number) => boolean;
}

// --- CONSTANTS ---
const LANE_WIDTH = 100; // px
const SPAWN_Z = -2500;
const PLAYER_Z = 0;
const SPEED_START = 20;
const SPEED_MAX = 60;

export const DataWhisperer: React.FC<DataWhispererProps> = ({ onComplete, t }) => {
  const [gameState, setGameState] = useState<'MENU' | 'RUNNING' | 'GAME_OVER' | 'WIN'>('MENU');
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [currentQuery, setCurrentQuery] = useState<Query>({ text: "INIT...", predicate: () => false });
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // We use Refs for high-frequency updates to avoid React render lag
  const playerLaneRef = useRef<Lane>(0);
  const entitiesRef = useRef<Entity[]>([]);
  const speedRef = useRef(SPEED_START);
  const scoreRef = useRef(0);
  const healthRef = useRef(100);
  const frameRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const gameLoopRef = useRef<number>(0);

  // This state is used JUST to trigger React re-renders for the UI
  // We update it every frame or every few frames
  const [renderTrigger, setRenderTrigger] = useState(0);

  // --- GAME LOGIC ---

  const generateQuery = useCallback(() => {
      const types: Query[] = [
          { text: t('whisperer.q_num_gt'), predicate: (v) => typeof v === 'number' && v > 50 },
          { text: t('whisperer.q_num_lt'), predicate: (v) => typeof v === 'number' && v < 50 },
          { text: t('whisperer.q_even'), predicate: (v) => typeof v === 'number' && v % 2 === 0 },
          { text: t('whisperer.q_admin'), predicate: (v) => v === 'ADMIN' },
          { text: t('whisperer.q_exe'), predicate: (v) => typeof v === 'string' && v.endsWith('.EXE') },
      ];
      return types[Math.floor(Math.random() * types.length)];
  }, [t]);

  const generateValue = (query: Query, shouldMatch: boolean): string | number => {
      const isNum = query.text.includes('NUMBER') || query.text.includes('>');
      const isEven = query.text.includes('EVEN');
      const isGt = query.text.includes('> 50');
      const isLt = query.text.includes('< 50');

      if (isNum) {
          let val = Math.floor(Math.random() * 100);
          // Force match/mismatch
          if (shouldMatch) {
              if (isGt) val = 51 + Math.floor(Math.random() * 49);
              if (isLt) val = Math.floor(Math.random() * 49);
              if (isEven) val = val % 2 === 0 ? val : val + 1;
          } else {
              if (isGt) val = Math.floor(Math.random() * 50);
              if (isLt) val = 51 + Math.floor(Math.random() * 49);
              if (isEven) val = val % 2 !== 0 ? val : val + 1;
          }
          return val;
      }
      
      // Strings
      if (query.text.includes('ADMIN')) return shouldMatch ? 'ADMIN' : 'GUEST';
      if (query.text.includes('.EXE')) return shouldMatch ? 'RUN.EXE' : 'LOG.TXT';
      return 'NULL';
  };

  const startGame = () => {
      setGameState('RUNNING');
      setScore(0);
      setHealth(100);
      
      // Reset Refs
      scoreRef.current = 0;
      healthRef.current = 100;
      playerLaneRef.current = 0;
      speedRef.current = SPEED_START;
      entitiesRef.current = [];
      lastSpawnRef.current = 0;
      
      setCurrentQuery(generateQuery());
      audio.playScan();

      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      loop();
  };

  const spawnRow = () => {
      const lanes: Lane[] = [-1, 0, 1];
      const pattern = Math.random();
      const spawnZ = SPAWN_Z;

      // 30% Chance: Wall across 2 lanes
      if (pattern < 0.3) {
          const safeLane = lanes[Math.floor(Math.random() * lanes.length)];
          lanes.forEach(l => {
              if (l !== safeLane) {
                  entitiesRef.current.push({ id: Math.random(), z: spawnZ, lane: l, type: 'ICE' });
              }
          });
      } 
      // 70% Chance: Data + Hazards
      else {
          const targetLane = lanes[Math.floor(Math.random() * lanes.length)];
          lanes.forEach(l => {
              if (l === targetLane) {
                  // Target Data
                  entitiesRef.current.push({ 
                      id: Math.random(), z: spawnZ, lane: l, type: 'DATA', 
                      val: generateValue(currentQuery, true), isTarget: true 
                  });
              } else if (Math.random() > 0.5) {
                  // Decoy or Wall
                  if (Math.random() > 0.5) {
                      entitiesRef.current.push({ 
                          id: Math.random(), z: spawnZ, lane: l, type: 'DATA', 
                          val: generateValue(currentQuery, false), isTarget: false 
                      });
                  } else {
                      entitiesRef.current.push({ id: Math.random(), z: spawnZ, lane: l, type: 'ICE' });
                  }
              }
          });
      }
  };

  const loop = () => {
      if (healthRef.current <= 0) {
          setGameState('GAME_OVER');
          return;
      }
      if (scoreRef.current >= 100) {
          setGameState('WIN');
          audio.playSuccess();
          setTimeout(() => onComplete(100), 1000);
          return;
      }

      // 1. Move Entities
      entitiesRef.current.forEach(e => {
          e.z += speedRef.current;
      });

      // 2. Spawn
      lastSpawnRef.current += speedRef.current;
      const spawnDistance = 600; 
      if (lastSpawnRef.current > spawnDistance) {
          spawnRow();
          lastSpawnRef.current = 0;
          // Increase Speed
          speedRef.current = Math.min(SPEED_MAX, speedRef.current + 0.1);
      }

      // 3. Collision
      // Player is at Z ~ 0. Hitbox Z: -50 to 50.
      entitiesRef.current.forEach(e => {
          if (!e.hit && e.z > -80 && e.z < 50) {
              if (e.lane === playerLaneRef.current) {
                  e.hit = true;
                  handleCollision(e);
              }
          }
      });

      // 4. Cleanup (Objects behind camera)
      entitiesRef.current = entitiesRef.current.filter(e => e.z < 500);

      // 5. Render Trigger
      setRenderTrigger(prev => prev + 1);
      
      gameLoopRef.current = requestAnimationFrame(loop);
  };

  const handleCollision = (e: Entity) => {
      if (e.type === 'ICE') {
          audio.playError();
          healthRef.current -= 30;
          setFeedback(t('whisperer.firewall_impact'));
          speedRef.current = Math.max(SPEED_START, speedRef.current - 5);
      } else if (e.type === 'DATA') {
          if (e.isTarget) {
              audio.playSuccess();
              scoreRef.current += 10;
              healthRef.current = Math.min(100, healthRef.current + 5);
              setFeedback(t('whisperer.packet_secured'));
          } else {
              audio.playError();
              healthRef.current -= 10;
              setFeedback(t('whisperer.corrupt_data'));
          }
      }
      
      // Switch query occasionally
      if (e.isTarget && Math.random() > 0.7) {
          setCurrentQuery(generateQuery());
          setFeedback(t('whisperer.query_update'));
      }

      setHealth(healthRef.current);
      setScore(scoreRef.current);
      setTimeout(() => setFeedback(null), 800);
  };

  // --- INPUT ---
  const movePlayer = (dir: -1 | 1) => {
      const next = playerLaneRef.current + dir;
      if (next >= -1 && next <= 1) {
          playerLaneRef.current = next as Lane;
          audio.playHover();
          setRenderTrigger(prev => prev + 1);
      }
  };

  useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
          if (gameState !== 'RUNNING') return;
          if (e.key === 'ArrowLeft' || e.key === 'a') movePlayer(-1);
          if (e.key === 'ArrowRight' || e.key === 'd') movePlayer(1);
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  return (
    <div className="h-full w-full bg-black relative overflow-hidden font-mono select-none touch-none">
        <Scanlines />
        <Vignette />

        {/* --- HUD --- */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black to-transparent">
            <div className="bg-black/60 border border-white/20 p-2 rounded-xl backdrop-blur-md">
                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center"><Heart size={10} className="mr-1 text-red-500"/> {t('whisperer.integrity')}</div>
                <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all ${health < 30 ? 'bg-red-600 animate-pulse' : 'bg-green-500'}`} style={{ width: `${health}%` }}></div>
                </div>
            </div>

            <div className="flex flex-col items-center">
                <div className="bg-yellow-900/40 border-2 border-yellow-500 px-6 py-2 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse">
                    <div className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest text-center mb-1">{t('whisperer.active_query')}</div>
                    <div className="text-yellow-100 font-black text-sm md:text-base whitespace-nowrap">{gameState === 'RUNNING' ? currentQuery.text : t('whisperer.standby')}</div>
                </div>
                {feedback && <div className={`mt-2 text-xs font-black px-3 py-1 rounded ${feedback === t('whisperer.packet_secured') ? 'bg-green-500 text-black' : 'bg-red-500 text-white'} animate-bounce`}>{feedback}</div>}
            </div>

            <div className="bg-black/60 border border-white/20 p-2 rounded-xl backdrop-blur-md text-right">
                <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center justify-end">{t('whisperer.data')} <Wifi size={10} className="ml-1 text-cyan-500"/></div>
                <div className="text-2xl font-black text-white">{score}<span className="text-xs text-gray-500">/100</span></div>
            </div>
        </div>

        {/* --- 3D SCENE --- */}
        <div className="absolute inset-0 perspective-[800px] overflow-hidden">
            {/* Container moves with perspective */}
            <div className="absolute inset-0 transform-style-3d">
                
                {/* Moving Grid Floor */}
                <div 
                    className="absolute inset-[-100%] bg-[linear-gradient(rgba(0,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.2)_1px,transparent_1px)] bg-[length:100px_100px]"
                    style={{ 
                        transform: `rotateX(70deg) translateY(${renderTrigger * (speedRef.current * 0.5)}px)`,
                        opacity: 0.3
                    }}
                ></div>

                {/* Player Ship */}
                {gameState === 'RUNNING' && (
                    <div 
                        className="absolute bottom-[10%] left-1/2 w-20 h-12 z-30 transition-transform duration-100 ease-out"
                        style={{ transform: `translateX(-50%) translateX(${playerLaneRef.current * LANE_WIDTH}px)` }}
                    >
                        <div className="w-full h-full bg-cyan-500 skew-x-[-10deg] border-b-4 border-cyan-300 shadow-[0_0_20px_#06b6d4] relative">
                            <div className="absolute top-0 left-2 right-2 h-1/2 bg-cyan-900 skew-x-[10deg] opacity-50"></div>
                            {/* Engine Trails */}
                            <div className="absolute -bottom-4 left-2 w-2 h-16 bg-cyan-400 blur-md"></div>
                            <div className="absolute -bottom-4 right-2 w-2 h-16 bg-cyan-400 blur-md"></div>
                        </div>
                    </div>
                )}

                {/* Entities */}
                {entitiesRef.current.map(e => {
                    if (e.hit) return null;
                    
                    const dist = 1000 / (1000 - e.z); 
                    const scale = Math.max(0, dist);
                    const x = (e.lane * LANE_WIDTH * 1.5) * scale; 
                    const y = 20 * scale; 
                    const opacity = Math.min(1, (e.z + 2500) / 500); 

                    return (
                        <div
                            key={e.id}
                            className="absolute top-1/2 left-1/2 flex items-center justify-center"
                            style={{
                                transform: `translate3d(-50%, -50%, 0) translate3d(${x}px, ${y}px, ${e.z}px)`,
                                opacity: e.z < -2000 ? 0 : 1,
                                zIndex: Math.floor(e.z + 3000)
                            }}
                        >
                            {e.type === 'ICE' ? (
                                <div className="w-32 h-32 bg-red-900/90 border-4 border-red-500 shadow-[0_0_30px_red] flex items-center justify-center">
                                    <Skull size={64} className="text-white animate-pulse" />
                                </div>
                            ) : (
                                <div className={`w-20 h-20 border-2 flex flex-col items-center justify-center shadow-lg backdrop-blur-md ${
                                    e.isTarget ? 'bg-cyan-900/80 border-cyan-400 text-cyan-100 shadow-[0_0_20px_#06b6d4]' : 'bg-gray-900/80 border-gray-600 text-gray-400'
                                }`}>
                                    <Database size={24} className="mb-1"/>
                                    <span className="text-xs font-black bg-black/50 px-1 rounded">{e.val}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* --- TOUCH CONTROLS --- */}
        {gameState === 'RUNNING' && (
            <div className="absolute inset-0 z-30 flex">
                <div 
                    className="flex-1 active:bg-white/5 transition-colors flex items-center justify-start pl-8 opacity-50 hover:opacity-100" 
                    onPointerDown={() => movePlayer(-1)}
                >
                    <ChevronLeft size={48} className="text-cyan-500/50" />
                </div>
                <div 
                    className="flex-1 active:bg-white/5 transition-colors flex items-center justify-end pr-8 opacity-50 hover:opacity-100" 
                    onPointerDown={() => movePlayer(1)}
                >
                    <ChevronRight size={48} className="text-cyan-500/50" />
                </div>
            </div>
        )}

        {/* --- MENUS --- */}
        {gameState === 'MENU' && (
            <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8 animate-in fade-in text-center">
                <Terminal size={64} className="text-cyan-500 mb-4 animate-bounce"/>
                <h1 className="text-4xl font-black text-white mb-2 italic tracking-tighter">{t('whisperer.title')}</h1>
                <div className="text-gray-400 text-sm mb-8 space-y-2 font-mono border border-gray-700 p-4 rounded bg-gray-900">
                    <p>{'>'} SYSTEM: NEURAL_LINK_ESTABLISHED</p>
                    <p>{'>'} MISSION: FILTER DATA STREAM</p>
                    <p>{'>'} <span className="text-cyan-400">BLUE</span> = {t('whisperer.collect')} ({t('architect.match')})</p>
                    <p>{'>'} <span className="text-red-500">RED</span> = {t('whisperer.avoid')} (Firewall)</p>
                </div>
                <Button size="lg" variant="primary" onClick={startGame} className="w-full max-w-xs shadow-[0_0_20px_#06b6d4]">
                    <Play size={20} className="mr-2"/> {t('whisperer.jack_in')}
                </Button>
            </div>
        )}

        {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 z-50 bg-red-950/90 flex flex-col items-center justify-center p-8 animate-in zoom-in text-center">
                <ShieldAlert size={80} className="text-white mb-4" />
                <h2 className="text-4xl font-black text-white mb-2">{t('whisperer.disconnected')}</h2>
                <p className="text-red-200 mb-8">Signal Integrity Lost.</p>
                <Button variant="primary" onClick={startGame}>{t('whisperer.reconnect')}</Button>
            </div>
        )}
    </div>
  );
};
